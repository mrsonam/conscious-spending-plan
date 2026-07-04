/** sessionStorage: user has seen the branded splash at least once this browser profile */
export const SPLASH_SEEN_STORAGE_KEY = "csp-splash-seen"

/** First visit / landing, full branded moment */
export const SPLASH_DISMISS_MS_FULL = 1100

/** Return visits, brief handoff from static HTML splash */
export const SPLASH_DISMISS_MS_RETURNING = 280

export const SPLASH_DISMISS_MS_MAX = 2400

export function hasSeenSplash(): boolean {
  if (typeof window === "undefined") return false
  try {
    return sessionStorage.getItem(SPLASH_SEEN_STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

export function markSplashSeen(): void {
  try {
    sessionStorage.setItem(SPLASH_SEEN_STORAGE_KEY, "1")
  } catch {
    /* private mode / blocked storage */
  }
}

/** Landing always gets the full splash; returning users get a short dismiss. */
export function splashDismissMs(onLanding: boolean): number {
  if (onLanding) return SPLASH_DISMISS_MS_FULL
  return hasSeenSplash() ? SPLASH_DISMISS_MS_RETURNING : SPLASH_DISMISS_MS_FULL
}
