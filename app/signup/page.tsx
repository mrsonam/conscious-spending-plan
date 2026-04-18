import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { SignupClient } from "./signup-client"
import {
  DASHBOARD_THEME_COOKIE,
  parseDashboardTheme,
} from "@/lib/dashboard-theme-cookie"
import type { DashboardTheme } from "@/lib/dashboard-theme"
import { auth } from "@/lib/auth"

export default async function SignupPage() {
  const session = await auth()
  if (session?.user?.id) {
    redirect("/dashboard")
  }

  const jar = await cookies()
  const raw = jar.get(DASHBOARD_THEME_COOKIE)?.value
  const initialTheme: DashboardTheme = parseDashboardTheme(raw)

  return <SignupClient initialTheme={initialTheme} />
}
