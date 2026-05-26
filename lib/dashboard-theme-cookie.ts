import type { DashboardTheme } from "./dashboard-theme"
import { PWA_THEME_COLOR_CONSOLE } from "./pwa-branding"

/** Device-local preference for dashboard shell (Wealth Console). */
export const DASHBOARD_THEME_COOKIE = "csp_dashboard_theme"

const MAX_AGE_SEC = 60 * 60 * 24 * 365

export function parseDashboardTheme(_value: string | undefined | null): DashboardTheme {
  return "console"
}

/** Parse from `document.cookie` or a raw Cookie header string. */
export function getDashboardThemeFromCookieString(_cookieStr: string): DashboardTheme {
  return "console"
}

export function applyDashboardThemeDataset(): void {
  if (typeof document === "undefined") return
  document.documentElement.dataset.cspDashboardTheme = "console"
}

export function setDashboardThemeCookie(_theme?: DashboardTheme): void {
  if (typeof document === "undefined") return
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : ""
  document.cookie = `${DASHBOARD_THEME_COOKIE}=console; path=/; max-age=${MAX_AGE_SEC}; SameSite=Lax${secure}`
  applyDashboardThemeDataset()
}

export function getDashboardThemeClient(): DashboardTheme {
  return "console"
}

/**
 * Inline script for <head>: dataset + iOS PWA chrome **before** React.
 * Strips duplicate `theme-color` tags (e.g. from the framework) and keeps ours last.
 */
export const DASHBOARD_THEME_COOKIE_BOOTSTRAP = `!function(){var C="${PWA_THEME_COLOR_CONSOLE}";function paint(){document.documentElement.dataset.cspDashboardTheme="console";document.documentElement.style.backgroundColor=C;var b=document.body;if(b)b.style.backgroundColor=C}function stripThemeColors(){document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){if(m.id!=="csp-theme-color")m.remove()})}try{paint();stripThemeColors();var tc=document.getElementById("csp-theme-color");if(!tc){tc=document.createElement("meta");tc.id="csp-theme-color";tc.name="theme-color";document.head.appendChild(tc)}tc.setAttribute("content",C);document.head.appendChild(tc);var sb=document.getElementById("csp-apple-status-bar");if(!sb){sb=document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')}if(!sb){sb=document.createElement("meta");sb.setAttribute("name","apple-mobile-web-app-status-bar-style");document.head.appendChild(sb)}sb.id="csp-apple-status-bar";sb.setAttribute("content","black-translucent")}catch(e){paint()}}();`
