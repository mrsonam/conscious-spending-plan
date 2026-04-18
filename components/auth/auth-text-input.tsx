"use client"

import * as React from "react"
import type { DashboardTheme } from "@/lib/dashboard-theme"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { cn } from "@/lib/utils"

export const authInputClassName = (theme: DashboardTheme) =>
  cn(
    "w-full rounded-xl border px-3 py-2.5 text-[15px] outline-none transition-shadow placeholder:opacity-60 focus-visible:ring-2 focus-visible:ring-offset-0 disabled:opacity-50 sm:text-sm",
    theme === "console"
      ? "focus-visible:ring-[rgba(78,222,163,0.45)]"
      : "border-slate-200 bg-white text-slate-900 shadow-sm focus-visible:ring-indigo-500/80",
  )

export function authInputStyle(theme: DashboardTheme): React.CSSProperties | undefined {
  if (theme !== "console") return undefined
  return {
    background: TOKENS.surfaceHigh,
    borderColor: TOKENS.outlineGhost,
    color: TOKENS.onSurface,
  }
}

export const AuthTextInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { theme: DashboardTheme }
>(({ theme, className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(authInputClassName(theme), className)}
    style={authInputStyle(theme)}
    {...props}
  />
))
AuthTextInput.displayName = "AuthTextInput"
