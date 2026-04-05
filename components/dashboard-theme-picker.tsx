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

  return (
    <div className={cn("space-y-3", className)}>
      {error ? (
        <p
          className={cn("text-sm", !isConsole && "text-red-600")}
          style={isConsole ? { color: ERROR_SOFT } : undefined}
          role="alert"
        >
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
              aria-current={selected ? "true" : undefined}
              onClick={() => void applyTheme(opt.id)}
              className={cn(
                "flex flex-col rounded-xl border-2 text-left transition-all",
                isConsole ? "p-3" : "p-4",
                !isConsole &&
                  (selected
                    ? "border-indigo-600 bg-indigo-50/80 shadow-sm"
                    : "border-gray-200 bg-white hover:border-indigo-300 hover:bg-gray-50/80"),
              )}
              style={
                isConsole
                  ? {
                      borderColor: selected ? TOKENS.primary : TOKENS.outlineGhost,
                      background: selected
                        ? `color-mix(in srgb, ${TOKENS.primary} 12%, ${TOKENS.surfaceHigh})`
                        : TOKENS.surfaceLow,
                      opacity: saving ? 0.65 : 1,
                    }
                  : undefined
              }
            >
              <div className="flex items-center gap-2">
                <Icon
                  className={cn("h-5 w-5", !isConsole && (selected ? "text-indigo-700" : "text-gray-500"))}
                  style={
                    isConsole
                      ? { color: selected ? TOKENS.primary : TOKENS.onSurfaceMuted }
                      : undefined
                  }
                />
                <span
                  className={cn("font-semibold", !isConsole && "text-gray-900")}
                  style={isConsole ? { color: TOKENS.onSurface } : undefined}
                >
                  {opt.title}
                </span>
                {selected ? (
                  <span
                    className={cn(
                      "ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                      !isConsole && "bg-indigo-600 text-white shadow-sm",
                    )}
                    style={
                      isConsole
                        ? {
                            backgroundColor: TOKENS.primary,
                            color: TOKENS.surfaceHigh,
                          }
                        : undefined
                    }
                    aria-hidden
                  >
                    <Check className="h-4 w-4 stroke-[2.5]" />
                  </span>
                ) : null}
              </div>
              {!isConsole ? (
                <p className="mt-2 text-sm leading-snug text-gray-600">{opt.description}</p>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
