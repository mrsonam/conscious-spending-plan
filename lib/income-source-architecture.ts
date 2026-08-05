import type { IncomeEntry } from "@/lib/income-page-types"

export const SOURCE_ARCHITECTURE_TOP_N = 5

export const SOURCE_ARCHITECTURE_COLORS = [
  "#4edea3",
  "#89ceff",
  "#c4b5fd",
  "#f0abfc",
  "#fbbf24",
  "#94a3b8", // Other
] as const

export type IncomeSourceRow = {
  label: string
  amount: number
  sharePct: number
  /** Signed % vs prior month for this label; null for Other or when not computable */
  momPct: number | null
  isNew: boolean
  isOther: boolean
  color: string
}

export type GroupedIncomeSources = {
  currentTotal: number
  rows: IncomeSourceRow[]
}

export function incomeSourceLabel(entry: IncomeEntry): string {
  const fromDesc = entry.description?.trim()
  if (fromDesc) return fromDesc.slice(0, 48)
  const fromAccount = entry.account?.name?.trim()
  if (fromAccount) return fromAccount.slice(0, 48)
  return "Unlabeled"
}

function isInMonth(isoDate: string, year: number, monthIndex: number): boolean {
  const t = new Date(isoDate).getTime()
  if (Number.isNaN(t)) return false
  const start = new Date(year, monthIndex, 1).getTime()
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999).getTime()
  return t >= start && t <= end
}

function sumByLabel(entries: IncomeEntry[], year: number, monthIndex: number): Map<string, number> {
  const map = new Map<string, number>()
  for (const e of entries) {
    if (!isInMonth(e.date, year, monthIndex)) continue
    const label = incomeSourceLabel(e)
    map.set(label, (map.get(label) || 0) + e.amount)
  }
  return map
}

/** Distinct income source labels contributing this month (not capped to topN). */
export function countCurrentMonthSources(entries: IncomeEntry[], now = new Date()): number {
  return sumByLabel(entries, now.getFullYear(), now.getMonth()).size
}

export function groupIncomeSources(
  entries: IncomeEntry[],
  priorMonthEntries: IncomeEntry[] = entries,
  options?: { now?: Date; topN?: number },
): GroupedIncomeSources {
  const now = options?.now ?? new Date()
  const topN = options?.topN ?? SOURCE_ARCHITECTURE_TOP_N
  const y = now.getFullYear()
  const m = now.getMonth()

  const currentMap = sumByLabel(entries, y, m)
  const priorMap = sumByLabel(priorMonthEntries, y, m - 1)

  const ranked = Array.from(currentMap.entries()).sort((a, b) => b[1] - a[1])
  const currentTotal = ranked.reduce((s, [, amt]) => s + amt, 0)
  if (currentTotal <= 0) return { currentTotal: 0, rows: [] }

  const top = ranked.slice(0, topN)
  const rest = ranked.slice(topN)
  const otherAmount = rest.reduce((s, [, amt]) => s + amt, 0)

  const rows: IncomeSourceRow[] = top.map(([label, amount], idx) => {
    const prior = priorMap.get(label) ?? 0
    const isNew = prior <= 0
    const momPct = isNew ? null : Math.round(((amount - prior) / prior) * 1000) / 10
    return {
      label,
      amount,
      sharePct: Math.round((amount / currentTotal) * 1000) / 10,
      momPct,
      isNew,
      isOther: false,
      color: SOURCE_ARCHITECTURE_COLORS[idx] ?? SOURCE_ARCHITECTURE_COLORS[0],
    }
  })

  if (otherAmount > 0) {
    rows.push({
      label: "Other",
      amount: otherAmount,
      sharePct: Math.round((otherAmount / currentTotal) * 1000) / 10,
      momPct: null,
      isNew: false,
      isOther: true,
      color: SOURCE_ARCHITECTURE_COLORS[5],
    })
  }

  return { currentTotal, rows }
}

/** Inclusive ISO date bounds for previous month start → current month end (local). */
export function sourceArchitectureDateRange(now = new Date()): {
  startDate: string
  endDate: string
} {
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  return { startDate: iso(start), endDate: iso(end) }
}
