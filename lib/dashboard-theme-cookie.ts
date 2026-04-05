import type { DashboardTheme } from "./dashboard-theme"
import {
  PWA_THEME_COLOR_CONSOLE,
  PWA_STATUS_CHROME_CLASSIC,
} from "./pwa-branding"

/** Device-local preference for dashboard shell (classic vs Wealth Console). */
export const DASHBOARD_THEME_COOKIE = "csp_dashboard_theme"

const MAX_AGE_SEC = 60 * 60 * 24 * 365

export function parseDashboardTheme(value: string | undefined | null): DashboardTheme {
  if (value === "console") return "console"
  return "classic"
}

/** Parse from `document.cookie` or a raw Cookie header string. */
export function getDashboardThemeFromCookieString(cookieStr: string): DashboardTheme {
  const match = cookieStr.match(
    new RegExp(`(?:^|;\\s*)${DASHBOARD_THEME_COOKIE}=([^;]*)`),
  )
  if (!match?.[1]) return "classic"
  return parseDashboardTheme(decodeURIComponent(match[1].trim()))
}

export function applyDashboardThemeDataset(theme: DashboardTheme): void {
  if (typeof document === "undefined") return
  document.documentElement.dataset.cspDashboardTheme = theme
}

export function setDashboardThemeCookie(theme: DashboardTheme): void {
  if (typeof document === "undefined") return
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : ""
  document.cookie = `${DASHBOARD_THEME_COOKIE}=${encodeURIComponent(theme)}; path=/; max-age=${MAX_AGE_SEC}; SameSite=Lax${secure}`
  applyDashboardThemeDataset(theme)
}

export function getDashboardThemeClient(): DashboardTheme {
  if (typeof document === "undefined") return "classic"
  const ds = document.documentElement.dataset.cspDashboardTheme
  if (ds === "console" || ds === "classic") return ds
  return getDashboardThemeFromCookieString(document.cookie)
}

/**
 * Inline script for <head>: dataset + iOS PWA chrome **before** React.
 * Strips duplicate `theme-color` tags (e.g. from the framework) and keeps ours last.
 */
export const DASHBOARD_THEME_COOKIE_BOOTSTRAP = `!function(){var C0="${PWA_STATUS_CHROME_CLASSIC}",C1="${PWA_THEME_COLOR_CONSOLE}";function stripThemeColors(){document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){if(m.id!=="csp-theme-color")m.remove()})}try{var ck=document.cookie.match(/(?:^|;\\s*)${DASHBOARD_THEME_COOKIE}=([^;]*)/);var v=ck?decodeURIComponent(ck[1]):"";var isConsole=v==="console";document.documentElement.dataset.cspDashboardTheme=isConsole?"console":"classic";var col=isConsole?C1:C0;stripThemeColors();var tc=document.getElementById("csp-theme-color");if(!tc){tc=document.createElement("meta");tc.id="csp-theme-color";tc.name="theme-color";document.head.appendChild(tc)}tc.setAttribute("content",col);document.head.appendChild(tc);var sb=document.getElementById("csp-apple-status-bar");if(!sb){sb=document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')}if(!sb){sb=document.createElement("meta");sb.setAttribute("name","apple-mobile-web-app-status-bar-style");document.head.appendChild(sb)}sb.id="csp-apple-status-bar";sb.setAttribute("content","black-translucent");if(isConsole)document.documentElement.style.backgroundColor=C1;else document.documentElement.style.backgroundColor=C0}catch(e){document.documentElement.dataset.cspDashboardTheme="classic"}}();`
