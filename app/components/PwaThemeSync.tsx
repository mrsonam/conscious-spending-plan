"use client"

import { useLayoutEffect } from "react"
import { PWA_THEME_COLOR_CONSOLE } from "@/lib/pwa-branding"

const META_ID = "csp-theme-color"
const STATUS_ID = "csp-apple-status-bar"

function removeAlienThemeColorMetas(): void {
  document.querySelectorAll('meta[name="theme-color"]').forEach((el) => {
    if (el.id !== META_ID) el.remove()
  })
}

/**
 * iOS standalone PWA: `theme-color` must be the **last** such meta, and Safari
 * only blends it reliably with `black-translucent`.
 */
export function PwaThemeSync() {
  useLayoutEffect(() => {
    if (typeof document === "undefined") return

    removeAlienThemeColorMetas()

    let meta = document.getElementById(META_ID) as HTMLMetaElement | null
    if (!meta) {
      meta = document.createElement("meta")
      meta.id = META_ID
      meta.name = "theme-color"
    }
    meta.setAttribute("content", PWA_THEME_COLOR_CONSOLE)
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
    statusMeta.setAttribute("content", "black-translucent")
    document.head.appendChild(statusMeta)

    document.documentElement.setAttribute("data-csp-dashboard-theme", "console")
  }, [])

  return null
}
