"use client"

import { Check, Circle } from "lucide-react"
import { getPasswordChecks } from "@/lib/password-policy"
import type { DashboardTheme } from "@/lib/dashboard-theme"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { cn } from "@/lib/utils"

export function PasswordRequirements({
  password,
  theme,
  className,
}: {
  password: string
  theme: DashboardTheme
  className?: string
}) {
  const isConsole = theme === "console"
  const checks = getPasswordChecks(password)

  return (
    <ul
      className={cn("mt-2 space-y-1.5 text-left text-xs leading-snug", className)}
      aria-live="polite"
      aria-label="Password requirements"
    >
      {checks.map(({ id, label, met }) => (
        <li key={id} className="flex items-start gap-2 rounded-lg px-1 py-0.5">
          {met ? (
            <Check
              className={cn(
                "mt-0.5 h-3.5 w-3.5 shrink-0",
                !isConsole && "text-emerald-600",
              )}
              style={isConsole ? { color: TOKENS.primary } : undefined}
              strokeWidth={2.5}
              aria-hidden
            />
          ) : (
            <Circle
              className={cn(
                "mt-0.5 h-3.5 w-3.5 shrink-0 opacity-50",
                !isConsole && "text-slate-400",
              )}
              style={isConsole ? { color: TOKENS.onSurfaceMuted } : undefined}
              strokeWidth={2}
              aria-hidden
            />
          )}
          <span
            className={cn(
              !isConsole && (met ? "text-emerald-800" : "text-slate-500"),
            )}
            style={isConsole ? { color: met ? TOKENS.primary : TOKENS.onSurfaceMuted } : undefined}
          >
            {label}
          </span>
        </li>
      ))}
    </ul>
  )
}
