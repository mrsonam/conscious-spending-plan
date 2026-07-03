import { addMonths } from "date-fns"

export type SubscriptionFrequency = "weekly" | "monthly" | "yearly"

const MS_DAY = 86400000

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** Normalize recurring charge to approximate monthly USD for dashboard totals. */
export function monthlyEquivalent(
  amount: number,
  frequency: SubscriptionFrequency
): number {
  switch (frequency) {
    case "weekly":
      return (amount * 52) / 12
    case "monthly":
      return amount
    case "yearly":
      return amount / 12
    default:
      return amount
  }
}

/**
 * Next billing date strictly after `from` (local midnight comparison).
 */
export function nextChargeDate(
  startDate: Date,
  frequency: SubscriptionFrequency,
  from: Date = new Date()
): Date {
  const fromT = startOfDay(from).getTime()
  const start = startOfDay(startDate)

  if (frequency === "weekly") {
    let cur = new Date(start)
    while (cur.getTime() <= fromT) {
      cur = new Date(cur.getTime() + 7 * MS_DAY)
    }
    return cur
  }

  if (frequency === "monthly") {
    const day = startDate.getDate()
    let cur = new Date(startDate)
    cur.setHours(0, 0, 0, 0)
    while (cur.getTime() <= fromT) {
      cur = addMonths(cur, 1)
      const lastDay = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate()
      cur.setDate(Math.min(day, lastDay))
    }
    return cur
  }

  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  cur.setHours(0, 0, 0, 0)
  while (cur.getTime() <= fromT) {
    cur.setFullYear(cur.getFullYear() + 1)
  }
  return cur
}

export type UpcomingEventKind = "renewal" | "trial" | "bill"

export type UpcomingEvent = {
  subscriptionId: string
  label: string
  provider: string | null
  amount: number
  date: string
  kind: UpcomingEventKind
  reminderDaysBefore: number
}

export function collectUpcomingEvents(
  rows: Array<{
    id: string
    label: string | null
    provider: string | null
    status: string
    trialEndsAt: Date | null
    nextRenewalAt: Date | null
    reminderDaysBefore: number
    recurringExpense: {
      amount: number
      frequency: string
      startDate: Date
      isActive: boolean
      description: string | null
    }
  }>,
  daysAhead: number,
  now: Date = new Date()
): UpcomingEvent[] {
  const end = new Date(now.getTime() + daysAhead * MS_DAY)
  const out: UpcomingEvent[] = []

  for (const s of rows) {
    if (s.status !== "active") continue
    if (!s.recurringExpense.isActive) continue

    const freq = s.recurringExpense.frequency as SubscriptionFrequency
    if (!["weekly", "monthly", "yearly"].includes(freq)) continue

    const displayName =
      s.label?.trim() ||
      s.recurringExpense.description?.trim() ||
      "Subscription"

    if (s.trialEndsAt) {
      const t = new Date(s.trialEndsAt)
      if (t.getTime() >= now.getTime() && t.getTime() <= end.getTime()) {
        out.push({
          subscriptionId: s.id,
          label: displayName,
          provider: s.provider,
          amount: s.recurringExpense.amount,
          date: t.toISOString(),
          kind: "trial",
          reminderDaysBefore: s.reminderDaysBefore,
        })
      }
    }

    const next = s.nextRenewalAt
      ? new Date(s.nextRenewalAt)
      : nextChargeDate(s.recurringExpense.startDate, freq, now)

    if (
      next.getTime() >= now.getTime() &&
      next.getTime() <= end.getTime()
    ) {
      out.push({
        subscriptionId: s.id,
        label: displayName,
        provider: s.provider,
        amount: s.recurringExpense.amount,
        date: next.toISOString(),
        kind: "renewal",
        reminderDaysBefore: s.reminderDaysBefore,
      })
    }
  }

  out.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  return out
}
