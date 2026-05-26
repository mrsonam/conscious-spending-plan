import { BENTO } from "./app-routes"

/** Wealth Console is the only dashboard shell. */
export type DashboardTheme = "console"

export const DASHBOARD_THEME: DashboardTheme = "console"

export function isDashboardTheme(value: unknown): value is DashboardTheme {
  return value === "console" || value === "classic"
}

/** Legacy DB/cookie values map to the console shell. */
export function normalizeDashboardTheme(_value: unknown): DashboardTheme {
  return "console"
}

export const DASHBOARD_HOME = BENTO.dashboard
