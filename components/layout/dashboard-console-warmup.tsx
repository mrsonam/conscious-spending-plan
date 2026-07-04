"use client"

import { useEffect } from "react"
import { prefetchDashboardConsole } from "@/lib/dashboard-console-cache"

/**
 * Prefetch Wealth Console JSON while the user is on any dashboard route.
 * Fires immediately on mount, the dashboard layout already guarantees
 * authentication via a server-side auth() check and redirect, so there is
 * no need to wait for the client session hook to resolve.
 */
export function DashboardConsoleWarmup() {
  useEffect(() => {
    prefetchDashboardConsole()
  }, [])

  return null
}
