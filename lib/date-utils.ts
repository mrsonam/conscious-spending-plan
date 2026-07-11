/**
 * `YYYY-MM-DD` for a date in the browser's local timezone.
 *
 * `date.toISOString().split("T")[0]` converts to UTC first, so it returns
 * yesterday's date for most of the day in timezones ahead of UTC (e.g.
 * Australia) — use this instead whenever "today" means the user's local day.
 */
export function getLocalDateString(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}
