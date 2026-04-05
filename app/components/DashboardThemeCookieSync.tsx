"use client"

import { useSession } from "next-auth/react"
import { useEffect } from "react"
import { setDashboardThemeCookie } from "@/lib/dashboard-theme-cookie"

/** Keeps the device cookie aligned with the server when the user is signed in. */
export function DashboardThemeCookieSync() {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return
    const next =
      session.user.dashboardTheme === "console" ? "console" : "classic"
    setDashboardThemeCookie(next)
  }, [status, session?.user?.dashboardTheme])

  return null
}
