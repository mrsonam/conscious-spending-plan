"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { LayoutDashboard, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type DashboardTheme,
  DASHBOARD_HOME,
} from "@/lib/dashboard-theme"

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
}: {
  className?: string
}) {
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
      router.replace(DASHBOARD_HOME[next])
      router.refresh()
    } catch {
      setError("Something went wrong. Try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {THEME_OPTIONS.map((opt) => {
          const Icon = opt.icon
          const selected = current === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              disabled={saving}
              onClick={() => void applyTheme(opt.id)}
              className={cn(
                "flex flex-col rounded-xl border-2 p-4 text-left transition-all",
                selected
                  ? "border-indigo-600 bg-indigo-50/80 shadow-sm"
                  : "border-gray-200 bg-white hover:border-indigo-300 hover:bg-gray-50/80"
              )}
            >
              <div className="flex items-center gap-2">
                <Icon
                  className={cn(
                    "h-5 w-5",
                    selected ? "text-indigo-700" : "text-gray-500"
                  )}
                />
                <span className="font-semibold text-gray-900">{opt.title}</span>
                {selected ? (
                  <span className="ml-auto text-xs font-medium text-indigo-700">
                    Active
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm leading-snug text-gray-600">
                {opt.description}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
