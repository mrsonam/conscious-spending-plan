/**
 * Diagnose pillar sum vs liquid for a user.
 * Usage: npx tsx scripts/diagnose-pillar-liquid.ts tsering.dikey25@gmail.com
 */

import { calculateCategoryTracking, TRACKING_CATEGORIES } from "../lib/category-tracking-calculation"
import {
  netPillarHeadroom,
  savingsSpendableAmount,
  sumDeployableBalance,
} from "../lib/category-tracking-shared"
import { buildAllocatedSoFarFromEntries } from "../lib/income-allocation"
import { getPreviousMonthRemainingAndOverspentByCategory, getCurrentMonthYear } from "../lib/monthly-tracking"
import { loadGeneralSavingsContext } from "../lib/saving-goal-general-savings"
import { sumLiquidAccountsMinor } from "../lib/plan-liquid-reconcile"
import { serializeMoneyForApi } from "../lib/money-api"
import { getUserDisplayCurrency } from "../lib/user-currency"
import { coerceMinor } from "../lib/money"
import { prisma } from "../lib/prisma"

async function main() {
  const email = process.argv[2]
  if (!email) {
    console.error("Usage: npx tsx scripts/diagnose-pillar-liquid.ts <email>")
    process.exit(1)
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  })
  if (!user) {
    console.error("User not found")
    process.exit(1)
  }

  const currency = await getUserDisplayCurrency(user.id)
  const toD = (m: bigint) => serializeMoneyForApi(m, currency)
  const { month, year } = getCurrentMonthYear()

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
    prisma.categoryBalance.findMany({ where: { userId: user.id, month, year } }),
    prisma.expense.groupBy({
      by: ["category"],
      where: {
        userId: user.id,
        date: { gte: startOfMonth, lte: endOfMonth },
        category: { in: [...TRACKING_CATEGORIES] },
      },
      _sum: { amount: true },
    }),
    prisma.transfer.groupBy({
      by: ["category"],
      where: {
        userId: user.id,
        date: { gte: startOfMonth, lte: endOfMonth },
        category: { in: [...TRACKING_CATEGORIES] },
      },
      _sum: { amount: true },
    }),
    prisma.incomeEntry.findMany({
      where: { userId: user.id, date: { gte: startOfMonth, lte: endOfMonth } },
      select: {
        amount: true,
        excludeFromAllocation: true,
        allocationFixedCosts: true,
        allocationSavings: true,
        allocationInvestment: true,
        allocationGuiltFreeSpending: true,
      },
    }),
    prisma.fundAllocation.findUnique({ where: { userId: user.id } }),
    getPreviousMonthRemainingAndOverspentByCategory(user.id, month, year),
    loadGeneralSavingsContext(prisma, user.id, month, year),
    sumLiquidAccountsMinor(user.id),
  ])

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
  const savingsBucket = toD(savingsCtx.savingsBucketMinor)

  console.log(`\n=== ${email} — ${month}/${year} ===\n`)
  console.log(`Liquid (checking+savings+cash): ${toD(liquidMinor)}`)

  let pillarSum = 0
  for (const cat of TRACKING_CATEGORIES) {
    const row = tracking[cat]
    const headroom = netPillarHeadroom(row)
    const spendable =
      cat === "savings"
        ? savingsSpendableAmount(row, savingsGoals, savingsGeneral)
        : headroom
    pillarSum += spendable
    console.log(`\n${cat}:`)
    console.log(`  envelope (balance): ${row.available}`)
    console.log(`  allocated (income): ${row.allocated}`)
    console.log(`  carryover: ${row.carryover}`)
    console.log(`  spent/transferred: ${row.spent}`)
    console.log(`  remaining: ${row.remaining}`)
    console.log(`  overspent: ${row.overspent}`)
    console.log(`  net headroom: ${headroom}`)
    if (cat === "savings") {
      console.log(`  bucket total: ${savingsBucket}`)
      console.log(`  in goals: ${savingsGoals}`)
      console.log(`  general available: ${savingsGeneral}`)
      console.log(`  spendable: ${spendable}`)
    } else {
      console.log(`  display: ${spendable}`)
    }
  }

  const deployable = sumDeployableBalance(tracking, savingsGeneral, savingsGoals)
  console.log(`\nPillar sum (deployable): ${deployable}`)
  console.log(`Gap (liquid - pillars): ${Math.round((toD(liquidMinor) - deployable) * 100) / 100}`)

  console.log(`\nCategory balances in DB:`)
  for (const b of categoryBalances) {
    console.log(`  ${b.category}: ${toD(b.balance ?? 0n)}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
