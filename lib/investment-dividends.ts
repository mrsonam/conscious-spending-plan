import type { RecentDividendRow } from "@/components/investments/investment-shared"
import { roundMoney } from "@/lib/optimistic-id"

export type DividendPayment = RecentDividendRow & { accountName: string }

export type DividendHoldingRow = {
  key: string
  symbol: string
  accountName: string
  count: number
  total: number
  lastPaid: string
}

export type DividendMonthGroup = {
  key: string
  label: string
  total: number
  payments: DividendPayment[]
}

export type DividendSummary = {
  total: number
  ytd: number
  last30Days: number
  count: number
  byHolding: DividendHoldingRow[]
  byMonth: DividendMonthGroup[]
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Totals, per-holding and per-month breakdown of dividend payments.
 * Dividend dates are entered as calendar days and stored at UTC midnight, so
 * months are bucketed on the UTC date to keep the day the user picked.
 */
export function summarizeDividends(
  rows: RecentDividendRow[],
  accounts: Array<{ id: string; name: string }>,
  now: Date = new Date(),
): DividendSummary {
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? "-"
  const payments: DividendPayment[] = rows
    .map((r) => ({ ...r, accountName: accountName(r.accountId) }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const currentYear = now.getUTCFullYear()
  const cutoff = now.getTime() - 30 * DAY_MS
  let total = 0
  let ytd = 0
  let last30Days = 0

  const holdings = new Map<string, DividendHoldingRow>()
  const months = new Map<string, DividendMonthGroup>()

  for (const p of payments) {
    const d = new Date(p.date)
    total += p.amount
    if (d.getUTCFullYear() === currentYear) ytd += p.amount
    if (d.getTime() >= cutoff) last30Days += p.amount

    const holdingKey = `${p.accountId}:${p.name.trim().toLowerCase()}`
    const holding = holdings.get(holdingKey)
    if (holding) {
      holding.count += 1
      holding.total += p.amount
    } else {
      // Payments are newest first, so the first one seen is the last paid.
      holdings.set(holdingKey, {
        key: holdingKey,
        symbol: p.name.trim().toUpperCase(),
        accountName: p.accountName,
        count: 1,
        total: p.amount,
        lastPaid: p.date,
      })
    }

    const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
    const month = months.get(monthKey)
    if (month) {
      month.total += p.amount
      month.payments.push(p)
    } else {
      months.set(monthKey, {
        key: monthKey,
        label: d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
        total: p.amount,
        payments: [p],
      })
    }
  }

  return {
    total: roundMoney(total),
    ytd: roundMoney(ytd),
    last30Days: roundMoney(last30Days),
    count: payments.length,
    byHolding: [...holdings.values()]
      .map((h) => ({ ...h, total: roundMoney(h.total) }))
      .sort((a, b) => b.total - a.total),
    byMonth: [...months.values()].map((m) => ({ ...m, total: roundMoney(m.total) })),
  }
}

/** Short day label for a dividend date (UTC, matching how the date was entered). */
export function formatDividendDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })
}
