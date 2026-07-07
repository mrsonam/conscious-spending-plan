import { addMonths } from "date-fns"

export type PresetRecurringFrequency =
  | "weekly"
  | "fortnightly"
  | "monthly"
  | "yearly"

export type RecurringFrequency = PresetRecurringFrequency | "custom"

export const PRESET_RECURRING_FREQUENCIES = [
  "weekly",
  "fortnightly",
  "monthly",
  "yearly",
] as const satisfies readonly PresetRecurringFrequency[]

export const ALL_RECURRING_FREQUENCIES = [
  ...PRESET_RECURRING_FREQUENCIES,
  "custom",
] as const satisfies readonly RecurringFrequency[]

const MS_DAY = 86_400_000
const DAYS_PER_YEAR = 365.25
const MAX_INTERVAL_DAYS = 366

export function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function addDays(date: Date, days: number): Date {
  return startOfDay(new Date(date.getTime() + days * MS_DAY))
}

export function paymentsPerMonth(
  frequency: string,
  intervalDays?: number | null,
): number {
  switch (frequency) {
    case "weekly":
      return 52 / 12
    case "fortnightly":
      return 26 / 12
    case "monthly":
      return 1
    case "yearly":
      return 1 / 12
    case "custom": {
      const days = intervalDays ?? 0
      if (days <= 0) return 1
      return DAYS_PER_YEAR / days / 12
    }
    default:
      return 1
  }
}

export function validateRecurringSchedule(
  frequency: string,
  intervalDays?: number | null,
): { ok: true } | { ok: false; error: string } {
  if (!ALL_RECURRING_FREQUENCIES.includes(frequency as RecurringFrequency)) {
    return {
      ok: false,
      error:
        "Frequency must be weekly, fortnightly, monthly, yearly, or custom",
    }
  }
  if (frequency === "custom") {
    const days = intervalDays ?? 0
    if (!Number.isInteger(days) || days < 1 || days > MAX_INTERVAL_DAYS) {
      return {
        ok: false,
        error: `Custom frequency requires interval days between 1 and ${MAX_INTERVAL_DAYS}`,
      }
    }
  }
  return { ok: true }
}

export function formatRecurringFrequencyLabel(
  frequency: string,
  intervalDays?: number | null,
): string {
  switch (frequency) {
    case "weekly":
      return "Weekly"
    case "fortnightly":
      return "Fortnightly"
    case "monthly":
      return "Monthly"
    case "yearly":
      return "Yearly"
    case "custom":
      return intervalDays ? `Every ${intervalDays} days` : "Custom"
    default:
      return frequency
  }
}

/** Normalize a charge to approximate monthly amount. */
export function monthlyEquivalent(
  amount: number,
  frequency: string,
  intervalDays?: number | null,
): number {
  switch (frequency) {
    case "weekly":
      return (amount * 52) / 12
    case "fortnightly":
      return (amount * 26) / 12
    case "monthly":
      return amount
    case "yearly":
      return amount / 12
    case "custom": {
      const days = intervalDays ?? 0
      if (days <= 0) return amount
      return (amount * DAYS_PER_YEAR) / days / 12
    }
    default:
      return amount
  }
}

function fixedIntervalDays(
  frequency: string,
  intervalDays?: number | null,
): number | null {
  switch (frequency) {
    case "weekly":
      return 7
    case "fortnightly":
      return 14
    case "custom":
      return intervalDays && intervalDays > 0 ? intervalDays : null
    default:
      return null
  }
}

/** Next charge date strictly after `from` (local midnight comparison). */
export function nextChargeDate(
  startDate: Date,
  frequency: string,
  from: Date = new Date(),
  intervalDays?: number | null,
): Date {
  const fromT = startOfDay(from).getTime()
  const start = startOfDay(startDate)

  const stepDays = fixedIntervalDays(frequency, intervalDays)
  if (stepDays) {
    let cur = new Date(start)
    while (cur.getTime() <= fromT) {
      cur = new Date(cur.getTime() + stepDays * MS_DAY)
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

export type RecurringSchedule = {
  frequency: string
  startDate: Date
  endDate?: Date | null
  intervalDays?: number | null
}

export function isWithinRange(date: Date, start: Date, end?: Date | null): boolean {
  const d = startOfDay(date)
  const s = startOfDay(start)
  if (end) {
    const e = startOfDay(end)
    return d >= s && d <= e
  }
  return d >= s
}

export function isDueOnDay(schedule: RecurringSchedule, day: Date): boolean {
  const start = startOfDay(schedule.startDate)
  const d = startOfDay(day)
  if (d < start) return false
  if (schedule.endDate && d > startOfDay(schedule.endDate)) return false

  const stepDays = fixedIntervalDays(schedule.frequency, schedule.intervalDays)
  if (stepDays) {
    const diff = Math.floor((d.getTime() - start.getTime()) / MS_DAY)
    return diff >= 0 && diff % stepDays === 0
  }

  if (schedule.frequency === "monthly") {
    return d.getDate() === start.getDate()
  }
  if (schedule.frequency === "yearly") {
    return d.getMonth() === start.getMonth() && d.getDate() === start.getDate()
  }
  return false
}

export function getDueDatesBetween(
  schedule: RecurringSchedule,
  afterDate: Date,
  upToDate: Date,
): Date[] {
  const start = startOfDay(schedule.startDate)
  const after = startOfDay(afterDate)
  const upTo = startOfDay(upToDate)
  const dates: Date[] = []

  if (upTo < start) return dates

  const stepDays = fixedIntervalDays(schedule.frequency, schedule.intervalDays)
  if (stepDays) {
    const diffMs = after.getTime() - start.getTime()
    const diffDays = Math.floor(diffMs / MS_DAY)
    const cyclesElapsed = Math.max(0, Math.ceil(diffDays / stepDays))
    let candidate = addDays(start, cyclesElapsed * stepDays)
    if (candidate.getTime() <= after.getTime()) {
      candidate = addDays(candidate, stepDays)
    }
    while (candidate.getTime() <= upTo.getTime()) {
      if (isWithinRange(candidate, start, schedule.endDate)) {
        dates.push(candidate)
      }
      candidate = addDays(candidate, stepDays)
    }
    return dates
  }

  if (schedule.frequency === "monthly") {
    const targetDay = start.getDate()
    let year = after.getFullYear()
    let month = after.getMonth()
    let candidate = startOfDay(new Date(year, month, targetDay))
    if (candidate.getTime() <= after.getTime()) {
      month++
      if (month > 11) {
        month = 0
        year++
      }
    }
    for (let i = 0; i < 100; i++) {
      candidate = startOfDay(new Date(year, month, targetDay))
      if (candidate.getDate() !== targetDay) {
        month++
        if (month > 11) {
          month = 0
          year++
        }
        continue
      }
      if (candidate.getTime() > upTo.getTime()) break
      if (isWithinRange(candidate, start, schedule.endDate)) {
        dates.push(new Date(candidate))
      }
      month++
      if (month > 11) {
        month = 0
        year++
      }
    }
    return dates
  }

  if (schedule.frequency === "yearly") {
    const targetMonth = start.getMonth()
    const targetDay = start.getDate()
    let year = after.getFullYear()
    let candidate = startOfDay(new Date(year, targetMonth, targetDay))
    if (candidate.getTime() <= after.getTime()) {
      year++
    }
    for (let i = 0; i < 100; i++) {
      candidate = startOfDay(new Date(year, targetMonth, targetDay))
      if (candidate.getTime() > upTo.getTime()) break
      if (isWithinRange(candidate, start, schedule.endDate)) {
        dates.push(new Date(candidate))
      }
      year++
    }
  }

  return dates
}
