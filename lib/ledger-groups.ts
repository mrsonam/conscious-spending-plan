export type LedgerGroupKey = "today" | "yesterday" | "thisWeek" | "earlierThisMonth" | "older"

export const LEDGER_GROUP_LABELS: Record<LedgerGroupKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  thisWeek: "This week",
  earlierThisMonth: "Earlier this month",
  older: "Older",
}

const LEDGER_GROUP_ORDER: LedgerGroupKey[] = [
  "today",
  "yesterday",
  "thisWeek",
  "earlierThisMonth",
  "older",
]

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function ledgerGroupKeyForDate(isoDate: string, now: Date = new Date()): LedgerGroupKey {
  const entryDay = startOfDay(new Date(isoDate))
  const today = startOfDay(now)
  const diffDays = Math.round((today.getTime() - entryDay.getTime()) / 86_400_000)

  if (diffDays <= 0) return "today"
  if (diffDays === 1) return "yesterday"
  if (diffDays <= 7) return "thisWeek"
  if (entryDay.getFullYear() === today.getFullYear() && entryDay.getMonth() === today.getMonth()) {
    return "earlierThisMonth"
  }
  return "older"
}

export type LedgerGroup<T> = {
  key: LedgerGroupKey
  label: string
  entries: T[]
}

/** Buckets entries (already date-sorted desc) into recency groups, preserving relative order. */
export function groupEntriesByRecency<T extends { date: string }>(
  entries: T[],
  now: Date = new Date(),
): LedgerGroup<T>[] {
  const buckets = new Map<LedgerGroupKey, T[]>(LEDGER_GROUP_ORDER.map((key) => [key, []]))

  for (const entry of entries) {
    buckets.get(ledgerGroupKeyForDate(entry.date, now))!.push(entry)
  }

  return LEDGER_GROUP_ORDER.filter((key) => buckets.get(key)!.length > 0).map((key) => ({
    key,
    label: LEDGER_GROUP_LABELS[key],
    entries: buckets.get(key)!,
  }))
}
