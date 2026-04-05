import { cookies } from "next/headers"
import { LoginClient } from "./login-client"
import {
  DASHBOARD_THEME_COOKIE,
  parseDashboardTheme,
} from "@/lib/dashboard-theme-cookie"
import type { DashboardTheme } from "@/lib/dashboard-theme"

export default async function LoginPage() {
  const jar = await cookies()
  const raw = jar.get(DASHBOARD_THEME_COOKIE)?.value
  const initialTheme: DashboardTheme = parseDashboardTheme(raw)

  return <LoginClient initialTheme={initialTheme} />
}
