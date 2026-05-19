import type { DashboardTheme } from "@/lib/dashboard-theme"

/** Routes that always use Wealth Console chrome (dark shell), regardless of stored theme. */
export function isWealthConsoleShellPath(pathname: string): boolean {
  if (pathname.startsWith("/classic")) return false
  if (pathname.startsWith("/onboarding")) return true
  return true
}

export function resolveDocumentDashboardTheme(
  pathname: string,
  sessionTheme: string | undefined | null,
  authenticated: boolean,
  cookieTheme: DashboardTheme,
): DashboardTheme {
  if (authenticated && isWealthConsoleShellPath(pathname)) {
    return "console"
  }
  if (authenticated) {
    return sessionTheme === "console" ? "console" : "classic"
  }
  return cookieTheme === "console" ? "console" : "classic"
}
