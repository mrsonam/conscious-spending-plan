"use client"

import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { useEffect } from "react"
import { setDashboardThemeCookie, getDashboardThemeClient } from "@/lib/dashboard-theme-cookie"
import { resolveDocumentDashboardTheme } from "@/lib/dashboard-shell-theme"

/** Keeps the device cookie aligned with the server when the user is signed in. */
export function DashboardThemeCookieSync() {
  const { data: session, status } = useSession()
  const pathname = usePathname()

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return
    const next = resolveDocumentDashboardTheme(
      pathname,
      session.user.dashboardTheme,
      true,
      getDashboardThemeClient(),
    )
    setDashboardThemeCookie(next)
  }, [pathname, status, session?.user, session?.user?.dashboardTheme])

  return null
}
