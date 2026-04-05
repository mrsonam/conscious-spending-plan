import type { DashboardTheme } from "@/lib/dashboard-theme"
import { TOKENS } from "@/lib/wealth-console-tokens"

/** Manifest / install defaults (brand indigo). */
export const PWA_THEME_COLOR_CLASSIC = "#6366f1"

/**
 * iOS standalone `theme-color` for **classic** (light shell).
 * Use near-white so `black-translucent` matches headers / login, not the manifest indigo.
 */
export const PWA_STATUS_CHROME_CLASSIC = "#ffffff"

/** Wealth Console — must match `TOKENS.surface` for status / Island surround. */
export const PWA_THEME_COLOR_CONSOLE = TOKENS.surface

/** Resolved `theme-color` for iOS PWA chrome from shell mode. */
export function pwaThemeColorForShell(theme: DashboardTheme): string {
  return theme === "console" ? PWA_THEME_COLOR_CONSOLE : PWA_STATUS_CHROME_CLASSIC
}
