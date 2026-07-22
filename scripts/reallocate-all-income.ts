/**
 * Backfill excluded-from-budget income into savings and reallocate every income month.
 *
 * Usage:
 *   npx tsx scripts/reallocate-all-income.ts [user-email]
 */

import { prisma } from "../lib/prisma"
import { reallocateMonthIncomeForUser } from "../lib/reallocate-month-income"
import { ensurePreTrackingSavingsBalances } from "../lib/pre-tracking-savings"
import { ensureMonthClosing, getCurrentMonthYear } from "../lib/monthly-tracking"
import { getUserDisplayCurrency } from "../lib/user-currency"
import { serializeMoneyForApi } from "../lib/money-api"
import { FUND_CATEGORIES } from "../lib/fund-allocation-fields"
import { coerceMinor } from "../lib/money"

async function backfillExcludedIncomeToSavings(userId: string) {
  const excluded = await prisma.incomeEntry.findMany({
    // Dividends are excluded income too, but their cash sits in the investment
    // account (not a liquid bucket) and must never be routed to savings.
    where: { userId, excludeFromAllocation: true, investmentDividend: null },
    select: {
      id: true,
      amount: true,
      allocationSavings: true,
    },
  })

  let patched = 0
  for (const entry of excluded) {
    const amount = coerceMinor(entry.amount)
    const currentSavings = entry.allocationSavings
    if (currentSavings != null && coerceMinor(currentSavings) === amount) {
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
  return { excludedCount: excluded.length, patched }
}

async function incomeMonthsForUser(userId: string) {
  const rows = await prisma.$queryRaw<Array<{ month: number; year: number }>>`
    SELECT DISTINCT
      EXTRACT(MONTH FROM date)::int AS month,
      EXTRACT(YEAR FROM date)::int AS year
    FROM "IncomeEntry"
    WHERE "userId" = ${userId}
    ORDER BY year ASC, month ASC
  `
  return rows
}

async function reallocateUser(userId: string, email: string | null) {
  const fundAllocation = await prisma.fundAllocation.findUnique({ where: { userId } })
  if (!fundAllocation) {
    console.log(`[${email ?? userId}] Skipped, no fund allocation`)
    return
  }

  const currency = await getUserDisplayCurrency(userId)
  const { excludedCount, patched } = await backfillExcludedIncomeToSavings(userId)
  console.log(
    `[${email ?? userId}] Excluded income: ${excludedCount} entries, ${patched} patched to savings`,
  )

  await ensurePreTrackingSavingsBalances(userId, { force: true })

  const months = await incomeMonthsForUser(userId)
  if (months.length === 0) {
    console.log(`[${email ?? userId}] No income months`)
    return
  }

  console.log(`[${email ?? userId}] Reallocating ${months.length} month(s)...`)

  for (const { month, year } of months) {
    const result = await reallocateMonthIncomeForUser(userId, currency, month, year)
    await ensureMonthClosing(userId, month, year)
    console.log(
      `  ${month}/${year}: ${result.entryCount} budget entries → savings income ${serializeMoneyForApi(result.incomeTotals.savings, currency)}`,
    )
  }

  const { month: nowMonth, year: nowYear } = getCurrentMonthYear()
  const last = await reallocateMonthIncomeForUser(userId, currency, nowMonth, nowYear)
  await ensureMonthClosing(userId, nowMonth, nowYear)

  console.log(`[${email ?? userId}] Current month ${nowMonth}/${nowYear} envelopes:`)
  for (const cat of FUND_CATEGORIES) {
    console.log(
      `  ${cat}: ${serializeMoneyForApi(last.envelopeTotals[cat], currency)}`,
    )
  }
}

async function main() {
  const emailArg = process.argv[2]?.trim().toLowerCase()

  const users = emailArg
    ? await prisma.user.findMany({
        where: { email: { equals: emailArg, mode: "insensitive" } },
        select: { id: true, email: true },
      })
    : await prisma.user.findMany({ select: { id: true, email: true } })

  if (users.length === 0) {
    console.error(emailArg ? `No user found for email: ${emailArg}` : "No users found.")
    process.exit(1)
  }

  for (const user of users) {
    await reallocateUser(user.id, user.email)
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
