/**
 * Correct previously logged dividends that were wrongly counted in the savings
 * bucket. Dividend cash lands in the investment account, not a liquid bucket,
 * so it should never contribute to any envelope. Zeroes each dividend income
 * entry's stored allocation and replays envelope balances / month closings so
 * the savings pillar drops by the amount that was wrongly added.
 *
 * Usage:
 *   npx tsx scripts/fix-dividend-savings-allocation.ts [user-email]
 */

import { prisma } from "../lib/prisma"
import { upsertEnvelopeBalancesForMonth } from "../lib/envelope-balance-recompute"
import { ensureMonthClosing } from "../lib/monthly-tracking"
import { getUserDisplayCurrency } from "../lib/user-currency"
import { serializeMoneyForApi } from "../lib/money-api"
import { coerceMinor } from "../lib/money"

async function patchDividendEntries(userId: string) {
  const dividendEntries = await prisma.incomeEntry.findMany({
    where: { userId, investmentDividend: { isNot: null } },
    select: { id: true, allocationSavings: true },
  })

  const needsFix = dividendEntries.filter(
    (entry) => entry.allocationSavings == null || coerceMinor(entry.allocationSavings) !== 0n,
  )

  if (needsFix.length === 0) {
    return { total: dividendEntries.length, patched: 0 }
  }

  await prisma.incomeEntry.updateMany({
    where: { id: { in: needsFix.map((e) => e.id) } },
    data: {
      allocationFixedCosts: 0n,
      allocationSavings: 0n,
      allocationInvestment: 0n,
      allocationGuiltFreeSpending: 0n,
    },
  })

  return { total: dividendEntries.length, patched: needsFix.length }
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

async function fixUser(userId: string, email: string | null) {
  const { total, patched } = await patchDividendEntries(userId)
  if (total === 0) {
    console.log(`[${email ?? userId}] No dividend income entries`)
    return
  }
  if (patched === 0) {
    console.log(`[${email ?? userId}] ${total} dividend entr${total === 1 ? "y" : "ies"}, already correct`)
    return
  }

  console.log(`[${email ?? userId}] Patched ${patched}/${total} dividend entries to zero allocation`)

  const currency = await getUserDisplayCurrency(userId)
  const months = await incomeMonthsForUser(userId)

  for (const { month, year } of months) {
    const balances = await upsertEnvelopeBalancesForMonth(userId, month, year, currency)
    await ensureMonthClosing(userId, month, year, currency)
    console.log(
      `  ${month}/${year}: savings envelope now ${serializeMoneyForApi(balances.savings, currency)}`,
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
    await fixUser(user.id, user.email)
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
