"use client"

import { useEffect } from "react"
import { prefetchDashboardConsole } from "@/lib/dashboard-console-cache"
import { useHydratedSession } from "@/hooks/use-hydrated-session"

/** Prefetch Wealth Console JSON while the user is on any dashboard route. */
export function DashboardConsoleWarmup() {
  const { status } = useHydratedSession()

  useEffect(() => {
    if (status === "authenticated") {
      prefetchDashboardConsole()
    }
  }, [status])

  return null
}
