"use client"

import { useSession } from "next-auth/react"
import { useLayoutEffect } from "react"
import {
  PWA_THEME_COLOR_CLASSIC,
  PWA_THEME_COLOR_CONSOLE,
} from "@/lib/pwa-branding"

const META_ID = "csp-theme-color"
const STATUS_ID = "csp-apple-status-bar"

/**
 * iOS standalone PWA uses the last `theme-color` meta for the top safe area /
 * Dynamic Island surround. Static layout defaults to classic indigo; Wealth
 * Console (bento) must override to the dark surface so the bar matches the UI.
 */
export function PwaThemeSync() {
  const { data: session, status } = useSession()

  useLayoutEffect(() => {
    if (typeof document === "undefined") return

    const isConsole =
      status === "authenticated" &&
      session?.user?.dashboardTheme === "console"
    const color = isConsole ? PWA_THEME_COLOR_CONSOLE : PWA_THEME_COLOR_CLASSIC

    let meta = document.getElementById(META_ID) as HTMLMetaElement | null
    if (!meta) {
      meta = document.createElement("meta")
      meta.id = META_ID
      meta.name = "theme-color"
    }
    meta.content = color
    document.head.appendChild(meta)

    let statusMeta = document.getElementById(STATUS_ID) as HTMLMetaElement | null
    if (!statusMeta) {
      statusMeta = document.querySelector(
        'meta[name="apple-mobile-web-app-status-bar-style"]',
      ) as HTMLMetaElement | null
    }
    if (!statusMeta) {
      statusMeta = document.createElement("meta")
      statusMeta.id = STATUS_ID
      statusMeta.setAttribute("name", "apple-mobile-web-app-status-bar-style")
    } else if (!statusMeta.id) {
      statusMeta.id = STATUS_ID
    }
    statusMeta.setAttribute(
      "content",
      isConsole ? "black-translucent" : "default",
    )
    document.head.appendChild(statusMeta)

    if (isConsole) {
      document.documentElement.style.backgroundColor = PWA_THEME_COLOR_CONSOLE
    } else {
      document.documentElement.style.removeProperty("background-color")
    }
  }, [session?.user?.dashboardTheme, status])

  return null
}
