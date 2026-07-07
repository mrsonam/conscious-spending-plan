import {
  ALL_RECURRING_FREQUENCIES,
  monthlyEquivalent as scheduleMonthlyEquivalent,
  nextChargeDate as scheduleNextChargeDate,
  type RecurringFrequency,
} from "@/lib/recurring-expense-schedule"

export type { RecurringFrequency, PresetRecurringFrequency } from "@/lib/recurring-expense-schedule"
export {
  ALL_RECURRING_FREQUENCIES,
  PRESET_RECURRING_FREQUENCIES,
  formatRecurringFrequencyLabel,
  validateRecurringSchedule,
  paymentsPerMonth,
} from "@/lib/recurring-expense-schedule"

export type SubscriptionFrequency = RecurringFrequency

/** @deprecated Use ALL_RECURRING_FREQUENCIES */
export const SUPPORTED_SUBSCRIPTION_FREQUENCIES = ALL_RECURRING_FREQUENCIES

/** Normalize recurring charge to approximate monthly USD for dashboard totals. */
export function monthlyEquivalent(
  amount: number,
  frequency: string,
  intervalDays?: number | null,
): number {
  return scheduleMonthlyEquivalent(amount, frequency, intervalDays)
}

/** Next billing date strictly after `from` (local midnight comparison). */
export function nextChargeDate(
  startDate: Date,
  frequency: string,
  from: Date = new Date(),
  intervalDays?: number | null,
): Date {
  return scheduleNextChargeDate(startDate, frequency, from, intervalDays)
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

const MS_DAY = 86_400_000

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
      intervalDays?: number | null
    }
  }>,
  daysAhead: number,
  now: Date = new Date(),
): UpcomingEvent[] {
  const end = new Date(now.getTime() + daysAhead * MS_DAY)
  const out: UpcomingEvent[] = []

  for (const s of rows) {
    if (s.status !== "active") continue
    if (!s.recurringExpense.isActive) continue

    const freq = s.recurringExpense.frequency
    if (!ALL_RECURRING_FREQUENCIES.includes(freq as RecurringFrequency)) continue

    const intervalDays = s.recurringExpense.intervalDays

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
      : nextChargeDate(
          s.recurringExpense.startDate,
          freq,
          now,
          intervalDays,
        )

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
