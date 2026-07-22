/**
 * Backfill the pillar debit for loans that were already outstanding before
 * loans were wired into fund-pillar tracking. Creates the linked "savings"
 * expense for each active loan from a liquid account (skipping investment /
 * other non-liquid sources, whose funds never touched a pillar) and replays
 * envelope balances / month closings so the savings pillar reflects it.
 *
 * Usage:
 *   npx tsx scripts/fix-loan-pillar-allocation.ts [user-email]
 */

import { prisma } from "../lib/prisma"
import { PRE_TRACKING_SAVINGS_ACCOUNT_TYPES } from "../lib/pre-tracking-savings"
import { upsertEnvelopeBalancesForMonth } from "../lib/envelope-balance-recompute"
import { ensureMonthClosing } from "../lib/monthly-tracking"
import { getUserDisplayCurrency } from "../lib/user-currency"
import { serializeMoneyForApi } from "../lib/money-api"
import { coerceMinor } from "../lib/money"

async function backfillLoansForUser(userId: string) {
  const loans = await prisma.loan.findMany({
    where: { userId, status: { not: "repaid" }, expenseId: null },
    include: { account: { select: { accountType: true } } },
  })

  if (loans.length === 0) {
    return { total: 0, patched: 0, months: [] as Array<{ month: number; year: number }> }
  }

  const months = new Set<string>()
  let patched = 0

  for (const loan of loans) {
    const isLiquid = (PRE_TRACKING_SAVINGS_ACCOUNT_TYPES as readonly string[]).includes(
      loan.account.accountType,
    )
    if (!isLiquid) continue

    const outstanding = coerceMinor(loan.amount) - coerceMinor(loan.repaidAmount)
    if (outstanding <= 0n) continue

    await prisma.$transaction(async (tx) => {
      const pillarExpense = await tx.expense.create({
        data: {
          userId,
          accountId: loan.accountId,
          amount: outstanding,
          description: `Loan to ${loan.borrowerName || "borrower"}`,
          category: "savings",
          expenseCategory: "loan",
          date: loan.date,
          source: "loan",
        },
      })
      await tx.loan.update({
        where: { id: loan.id },
        data: { expenseId: pillarExpense.id },
      })
    })

    patched++
    months.add(`${loan.date.getMonth() + 1}-${loan.date.getFullYear()}`)
  }

  return {
    total: loans.length,
    patched,
    months: [...months].map((m) => {
      const [month, year] = m.split("-").map(Number)
      return { month, year }
    }),
  }
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
  const { total, patched, months: loanMonths } = await backfillLoansForUser(userId)
  if (total === 0) {
    console.log(`[${email ?? userId}] No outstanding loans needing a pillar link`)
    return
  }
  if (patched === 0) {
    console.log(`[${email ?? userId}] ${total} outstanding loan(s), none from liquid accounts`)
    return
  }

  console.log(`[${email ?? userId}] Linked ${patched}/${total} outstanding loan(s) to a savings pillar debit`)

  const currency = await getUserDisplayCurrency(userId)
  // Replay every income month forward, plus the loan's own month in case it
  // predates or falls outside any logged income, so the debit's effect
  // carries through to the current month (same as the dividend backfill).
  const incomeMonths = await incomeMonthsForUser(userId)
  const monthKey = (m: number, y: number) => y * 12 + m
  const byKey = new Map<number, { month: number; year: number }>()
  for (const m of [...incomeMonths, ...loanMonths]) {
    byKey.set(monthKey(m.month, m.year), m)
  }
  const allMonths = [...byKey.values()].sort(
    (a, b) => monthKey(a.month, a.year) - monthKey(b.month, b.year),
  )

  for (const { month, year } of allMonths) {
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
