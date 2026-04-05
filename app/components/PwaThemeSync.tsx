"use client"

import { useSession } from "next-auth/react"
import { useLayoutEffect } from "react"
import {
  PWA_STATUS_CHROME_CLASSIC,
  PWA_THEME_COLOR_CONSOLE,
} from "@/lib/pwa-branding"
import { getDashboardThemeClient } from "@/lib/dashboard-theme-cookie"

const META_ID = "csp-theme-color"
const STATUS_ID = "csp-apple-status-bar"

function removeAlienThemeColorMetas(): void {
  document.querySelectorAll('meta[name="theme-color"]').forEach((el) => {
    if (el.id !== META_ID) el.remove()
  })
}

/**
 * iOS standalone PWA: `theme-color` must be the **last** such meta, and Safari
 * only blends it reliably with `black-translucent`. We strip framework-injected
 * duplicates and re-append ours after every auth / theme change.
 */
export function PwaThemeSync() {
  const { data: session, status } = useSession()

  useLayoutEffect(() => {
    if (typeof document === "undefined") return

    const isConsole =
      status === "authenticated"
        ? session?.user?.dashboardTheme === "console"
        : getDashboardThemeClient() === "console"
    const color = isConsole ? PWA_THEME_COLOR_CONSOLE : PWA_STATUS_CHROME_CLASSIC

    removeAlienThemeColorMetas()

    let meta = document.getElementById(META_ID) as HTMLMetaElement | null
    if (!meta) {
      meta = document.createElement("meta")
      meta.id = META_ID
      meta.name = "theme-color"
    }
    meta.setAttribute("content", color)
    document.head.appendChild(meta)

    let statusMeta = document.getElementById(STATUS_ID) as HTMLMetaElement | null
    if (!statusMeta) {
      statusMeta = document.querySelector(
        'meta[name="apple-mobile-web-app-status-bar-style"]',
      ) as HTMLMetaElement | null
    }
    if (!statusMeta) {
      statusMeta = document.createElement("meta")
      statusMeta.setAttribute("name", "apple-mobile-web-app-status-bar-style")
      document.head.appendChild(statusMeta)
    }
    statusMeta.id = STATUS_ID
    /** Required for `theme-color` to paint the status / Island area on iOS. */
    statusMeta.setAttribute("content", "black-translucent")
    document.head.appendChild(statusMeta)

    document.documentElement.style.backgroundColor = color
  }, [session?.user?.dashboardTheme, status])

  return null
}
