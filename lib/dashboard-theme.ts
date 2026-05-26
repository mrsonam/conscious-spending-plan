import { BENTO } from "./app-routes"

export const DASHBOARD_THEMES = ["classic", "console"] as const

export type DashboardTheme = (typeof DASHBOARD_THEMES)[number]

export function isDashboardTheme(value: unknown): value is DashboardTheme {
  return (
    typeof value === "string" &&
    (DASHBOARD_THEMES as readonly string[]).includes(value)
  )
}

/** All dashboard destinations use the Wealth Console shell. */
export const DASHBOARD_HOME: Record<DashboardTheme, string> = {
  classic: BENTO.dashboard,
  console: BENTO.dashboard,
}
