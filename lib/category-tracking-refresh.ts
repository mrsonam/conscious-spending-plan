import { prisma } from "@/lib/prisma"
import { ensureMonthClosing } from "@/lib/monthly-tracking"
import { reallocateMonthIncomeForUser } from "@/lib/reallocate-month-income"
import {
  ensurePreTrackingSavingsBalances,
  invalidatePreTrackingEnsureCache,
} from "@/lib/pre-tracking-savings"

export type CalendarMonth = { month: number; year: number }

function monthKey({ month, year }: CalendarMonth) {
  return `${year}-${String(month).padStart(2, "0")}`
}

function parseMonthKey(key: string): CalendarMonth {
  const [yearStr, monthStr] = key.split("-")
  return { year: Number(yearStr), month: Number(monthStr) }
}

function nextMonth({ month, year }: CalendarMonth): CalendarMonth {
  return month === 12 ? { month: 1, year: year + 1 } : { month: month + 1, year }
}

/** Collect months that have income, expenses, transfers, or category balances. */
export async function listActiveTrackingMonths(userId: string): Promise<CalendarMonth[]> {
  const keys = new Set<string>()

  const [incomeDates, expenseDates, transferDates, balanceRows] = await Promise.all([
    prisma.incomeEntry.findMany({
      where: { userId },
      select: { date: true },
      distinct: ["date"],
    }),
    prisma.expense.findMany({
      where: { userId },
      select: { date: true },
      distinct: ["date"],
    }),
    prisma.transfer.findMany({
      where: { userId },
      select: { date: true },
      distinct: ["date"],
    }),
    prisma.categoryBalance.findMany({
      where: { userId },
      select: { month: true, year: true },
    }),
  ])

  for (const row of incomeDates) {
    const d = new Date(row.date)
    keys.add(monthKey({ month: d.getMonth() + 1, year: d.getFullYear() }))
  }
  for (const row of expenseDates) {
    const d = new Date(row.date)
    keys.add(monthKey({ month: d.getMonth() + 1, year: d.getFullYear() }))
  }
  for (const row of transferDates) {
    const d = new Date(row.date)
    keys.add(monthKey({ month: d.getMonth() + 1, year: d.getFullYear() }))
  }
  for (const row of balanceRows) {
    keys.add(monthKey({ month: row.month, year: row.year }))
  }

  return [...keys].sort().map(parseMonthKey)
}

/**
 * Rebuild envelopes and month closings from `start` through `end` (inclusive).
 * Must run in chronological order so carry reflects transfers/expenses.
 */
export async function refreshTrackingChain(
  userId: string,
  currency: string,
  start: CalendarMonth,
  end: CalendarMonth,
) {
  invalidatePreTrackingEnsureCache(userId)
  await ensurePreTrackingSavingsBalances(userId, { force: true })

  let cursor = start
  while (true) {
    await reallocateMonthIncomeForUser(userId, currency, cursor.month, cursor.year)
    await ensureMonthClosing(userId, cursor.month, cursor.year, currency)

    if (cursor.month === end.month && cursor.year === end.year) break
    cursor = nextMonth(cursor)
  }
}

/** Refresh from the transfer/expense month through the latest active month. */
export async function refreshTrackingChainFromMonth(
  userId: string,
  currency: string,
  month: number,
  year: number,
) {
  const active = await listActiveTrackingMonths(userId)
  if (active.length === 0) return

  const startKey = monthKey({ month, year })
  const sorted = active.filter((m) => monthKey(m) >= startKey)
  if (sorted.length === 0) return

  const start = sorted[0]
  const end = active[active.length - 1]
  await refreshTrackingChain(userId, currency, start, end)
}
