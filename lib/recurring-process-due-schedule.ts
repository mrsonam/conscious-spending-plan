import { getLocalDateString } from "@/lib/date-utils"

/** localStorage: last calendar day (local TZ) we successfully ran process-due */
export const RECURRING_PROCESS_DUE_DATE_KEY = "csp-recurring-process-due-date"

export const localDateKey = getLocalDateString

export function hasProcessedRecurringDueToday(): boolean {
  if (typeof window === "undefined") return true
  try {
    return (
      localStorage.getItem(RECURRING_PROCESS_DUE_DATE_KEY) === localDateKey()
    )
  } catch {
    return false
  }
}

export function markRecurringProcessDueRanToday(): void {
  try {
    localStorage.setItem(RECURRING_PROCESS_DUE_DATE_KEY, localDateKey())
  } catch {
    /* private mode / blocked storage */
  }
}

type IdleCapableWindow = Window & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions,
  ) => number
  cancelIdleCallback?: (id: number) => void
}

/**
 * Run work after first paint when the browser is idle (fallback: short timeout).
 * Returns a cancel function for effect cleanup.
 */
export function scheduleWhenIdle(
  task: () => void | Promise<void>,
  options?: { timeoutMs?: number; fallbackMs?: number },
): () => void {
  const timeoutMs = options?.timeoutMs ?? 8_000
  const fallbackMs = options?.fallbackMs ?? 200

  const run = () => {
    void Promise.resolve(task()).catch((error) => {
      console.error("Idle scheduled task failed:", error)
    })
  }

  const win = window as IdleCapableWindow
  if (typeof win.requestIdleCallback === "function") {
    const id = win.requestIdleCallback(() => run(), { timeout: timeoutMs })
    return () => win.cancelIdleCallback?.(id)
  }

  const timer = window.setTimeout(run, fallbackMs)
  return () => clearTimeout(timer)
}
