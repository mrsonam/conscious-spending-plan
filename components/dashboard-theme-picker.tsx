"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Check, LayoutDashboard, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type DashboardTheme,
  DASHBOARD_HOME,
} from "@/lib/dashboard-theme"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "@/lib/income-page-types"
import { setDashboardThemeCookie } from "@/lib/dashboard-theme-cookie"

const THEME_OPTIONS: {
  id: DashboardTheme
  title: string
  description: string
  icon: typeof LayoutDashboard
}[] = [
  {
    id: "classic",
    title: "Classic",
    description:
      "Original dashboard with tabs, charts, and the full Conscious Spending layout.",
    icon: LayoutDashboard,
  },
  {
    id: "console",
    title: "Wealth Console",
    description:
      "Dark bento-style overview with operational metrics and workspace shortcuts.",
    icon: Sparkles,
  },
]

export function DashboardThemePicker({
  className,
  variant = "classic",
}: {
  className?: string
  /** Wealth Console styling when `console`. */
  variant?: "classic" | "console"
}) {
  const isConsole = variant === "console"
  const { data: session, update } = useSession()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const current: DashboardTheme =
    session?.user?.dashboardTheme === "console" ? "console" : "classic"

  const applyTheme = async (next: DashboardTheme) => {
    if (next === current || saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/user/dashboard-theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dashboardTheme: next }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Could not save theme"
        )
        return
      }
      await update({ dashboardTheme: next })
      setDashboardThemeCookie(next)
      router.replace(DASHBOARD_HOME[next])
      router.refresh()
    } catch {
      setError("Something went wrong. Try again.")
    } finally {
      setSaving(false)
    }
  }

  // Bento is the only supported mode; keep the code but hide the selector in the UI.
  return null
}
