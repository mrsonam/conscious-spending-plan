"use client"

import { useEffect } from "react"
import { setDashboardThemeCookie } from "@/lib/dashboard-theme-cookie"

/** Keeps PWA chrome and html background aligned with Wealth Console on the public landing. */
export function LandingThemeSync() {
  useEffect(() => {
    const html = document.documentElement
    const previous = html.getAttribute("data-csp-dashboard-theme")
    html.setAttribute("data-csp-dashboard-theme", "console")
    html.style.colorScheme = "dark"
    setDashboardThemeCookie("console")

    return () => {
      if (previous && previous !== "console") {
        html.setAttribute("data-csp-dashboard-theme", previous)
      }
    }
  }, [])

  return null
}
