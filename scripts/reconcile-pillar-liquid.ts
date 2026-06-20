/**
 * Reallocate income, trim savings envelope to match liquid, verify pillar sum.
 *
 * Usage: npx tsx scripts/reconcile-pillar-liquid.ts [user-email]
 */

import { calculateCategoryTracking, TRACKING_CATEGORIES } from "../lib/category-tracking-calculation"
import {
  reconcileTrackingDisplayToLiquid,
  sumDeployableBalance,
} from "../lib/category-tracking-shared"
import { buildAllocatedSoFarFromEntries } from "../lib/income-allocation"
import {
  ensureMonthClosing,
  getCurrentMonthYear,
  getPreviousMonthRemainingAndOverspentByCategory,
} from "../lib/monthly-tracking"
import { loadGeneralSavingsContext } from "../lib/saving-goal-general-savings"
import {
  applyLiquidGapToSavingsEnvelope,
  sumLiquidAccountsMinor,
} from "../lib/plan-liquid-reconcile"
import { ensurePreTrackingSavingsBalances } from "../lib/pre-tracking-savings"
import { reallocateMonthIncomeForUser } from "../lib/reallocate-month-income"
import { serializeMoneyForApi } from "../lib/money-api"
import { getUserDisplayCurrency } from "../lib/user-currency"
import { coerceMinor } from "../lib/money"
import { prisma } from "../lib/prisma"

async function backfillExcludedIncomeToSavings(userId: string) {
  const excluded = await prisma.incomeEntry.findMany({
    where: { userId, excludeFromAllocation: true },
    select: { id: true, amount: true, allocationSavings: true },
  })

  let patched = 0
  for (const entry of excluded) {
    const amount = coerceMinor(entry.amount)
    if (entry.allocationSavings != null && coerceMinor(entry.allocationSavings) === amount) {
      continue
    }
    await prisma.incomeEntry.update({
      where: { id: entry.id },
      data: {
        allocationFixedCosts: 0n,
        allocationSavings: amount,
        allocationInvestment: 0n,
        allocationGuiltFreeSpending: 0n,
      },
    })
    patched++
  }
  return patched
}

async function incomeMonthsForUser(userId: string) {
  return prisma.$queryRaw<Array<{ month: number; year: number }>>`
    SELECT DISTINCT
      EXTRACT(MONTH FROM date)::int AS month,
      EXTRACT(YEAR FROM date)::int AS year
    FROM "IncomeEntry"
    WHERE "userId" = ${userId}
    ORDER BY year ASC, month ASC
  `
}

async function measureGap(userId: string, currency: string, month: number, year: number) {
  const startOfMonth = new Date(year, month - 1, 1)
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999)

  const [
    categoryBalances,
    expenses,
    transfers,
    incomeEntries,
    fundAllocation,
    previousMonth,
    savingsCtx,
    liquidMinor,
  ] = await Promise.all([
    prisma.categoryBalance.findMany({ where: { userId, month, year } }),
    prisma.expense.groupBy({
      by: ["category"],
      where: {
        userId,
        date: { gte: startOfMonth, lte: endOfMonth },
        category: { in: [...TRACKING_CATEGORIES] },
      },
      _sum: { amount: true },
    }),
    prisma.transfer.groupBy({
      by: ["category"],
      where: {
        userId,
        date: { gte: startOfMonth, lte: endOfMonth },
        category: { in: [...TRACKING_CATEGORIES] },
      },
      _sum: { amount: true },
    }),
    prisma.incomeEntry.findMany({
      where: { userId, date: { gte: startOfMonth, lte: endOfMonth } },
      select: {
        amount: true,
        excludeFromAllocation: true,
        allocationFixedCosts: true,
        allocationSavings: true,
        allocationInvestment: true,
        allocationGuiltFreeSpending: true,
      },
    }),
    prisma.fundAllocation.findUnique({ where: { userId } }),
    getPreviousMonthRemainingAndOverspentByCategory(userId, month, year),
    loadGeneralSavingsContext(prisma, userId, month, year),
    sumLiquidAccountsMinor(userId),
  ])

  const toD = (m: bigint) => serializeMoneyForApi(m, currency)
  const incomeAllocatedMinor = fundAllocation
    ? buildAllocatedSoFarFromEntries(incomeEntries, fundAllocation, currency)
    : null

  const incomeAllocatedByCategory: Record<string, number> = {}
  if (incomeAllocatedMinor) {
    for (const cat of TRACKING_CATEGORIES) {
      incomeAllocatedByCategory[cat] = toD(incomeAllocatedMinor[cat])
    }
  }

  const tracking = calculateCategoryTracking({
    categoryBalances: categoryBalances.map((b) => ({
      category: b.category,
      balance: toD(b.balance ?? 0n),
    })),
    expenses: expenses.map((e) => ({
      category: e.category,
      amount: toD(e._sum.amount ?? 0n),
    })),
    transfers: transfers.map((t) => ({
      category: t.category,
      amount: toD(t._sum.amount ?? 0n),
    })),
    investments: [],
    carryoverByCategory: previousMonth.remaining,
    overspentByCategory: previousMonth.overspent,
    incomeAllocatedByCategory: incomeAllocatedMinor ? incomeAllocatedByCategory : undefined,
  })

  const savingsGeneral = toD(savingsCtx.availableMinor)
  const savingsGoals = toD(savingsCtx.assignedToGoalsMinor)
  const deployable = sumDeployableBalance(tracking, savingsGeneral, savingsGoals)
  const liquid = toD(liquidMinor)
  const gap = Math.round((liquid - deployable) * 100) / 100

  const displayTracking = reconcileTrackingDisplayToLiquid(tracking, liquid)
  const displaySum = sumDeployableBalance(displayTracking, savingsGeneral, savingsGoals)

  return { liquid, deployable, gap, displaySum, tracking, savingsGeneral, savingsGoals }
}

async function reconcileUser(userId: string, email: string | null) {
  const currency = await getUserDisplayCurrency(userId)
  const { month, year } = getCurrentMonthYear()

  const fundAllocation = await prisma.fundAllocation.findUnique({ where: { userId } })
  if (!fundAllocation) {
    console.log(`[${email ?? userId}] Skipped — no fund allocation`)
    return
  }

  console.log(`\n=== ${email ?? userId} ===`)

  const patched = await backfillExcludedIncomeToSavings(userId)
  if (patched > 0) {
    console.log(`Patched ${patched} excluded income row(s) to savings`)
  }

  await ensurePreTrackingSavingsBalances(userId, { force: true })

  const months = await incomeMonthsForUser(userId)
  for (const { month: m, year: y } of months) {
    await reallocateMonthIncomeForUser(userId, currency, m, y)
    await ensureMonthClosing(userId, m, y)
  }
  console.log(`Reallocated ${months.length} income month(s)`)

  let before = await measureGap(userId, currency, month, year)
  console.log(
    `Before trim: liquid=${before.liquid} pillars=${before.deployable} gap=${before.gap}`,
  )

  const trim = await applyLiquidGapToSavingsEnvelope(
    userId,
    month,
    year,
    currency,
    before.gap,
  )
  if (trim.applied) {
    await ensureMonthClosing(userId, month, year)
    console.log(`Trimmed savings envelope by ${trim.adjustment} (gap correction)`)
  }

  const after = await measureGap(userId, currency, month, year)
  console.log(
    `After trim:  liquid=${after.liquid} pillars=${after.deployable} gap=${after.gap}`,
  )
  console.log(`Display sum (reconciled): ${after.displaySum}`)

  if (Math.abs(after.gap) > 0.01) {
    console.warn(`Warning: raw pillar gap still ${after.gap} — display layer reconciles to liquid`)
  } else {
    console.log("Pillar sum matches liquid.")
  }
}

async function main() {
  const emailArg = process.argv[2]?.trim()
  const users = emailArg
    ? await prisma.user.findMany({
        where: { email: { equals: emailArg, mode: "insensitive" } },
        select: { id: true, email: true },
      })
    : await prisma.user.findMany({ select: { id: true, email: true } })

  if (users.length === 0) {
    console.error(emailArg ? `No user: ${emailArg}` : "No users")
    process.exit(1)
  }

  for (const user of users) {
    await reconcileUser(user.id, user.email)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
