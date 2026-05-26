import type { DashboardTheme } from "@/lib/dashboard-theme"

/** Routes that use Wealth Console chrome (dark shell). */
export function isWealthConsoleShellPath(_pathname: string): boolean {
  if (_pathname.startsWith("/onboarding")) return true
  return true
}

export function resolveDocumentDashboardTheme(
  pathname: string,
  _sessionTheme: string | undefined | null,
  authenticated: boolean,
  _cookieTheme: DashboardTheme,
): DashboardTheme {
  if (authenticated && isWealthConsoleShellPath(pathname)) {
    return "console"
  }
  return "console"
}
