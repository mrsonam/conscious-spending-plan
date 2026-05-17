"use client"

import type { DashboardTheme } from "@/lib/dashboard-theme"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { cn } from "@/lib/utils"

export function AuthDivider({ theme }: { theme: DashboardTheme }) {
  const isConsole = theme === "console"
  return (
    <div className="relative my-6">
      <div
        className={cn("absolute inset-0 flex items-center", !isConsole && "border-t border-slate-200")}
        style={isConsole ? { borderTop: `1px solid ${TOKENS.outlineGhost}` } : undefined}
        aria-hidden
      />
      <div className="relative flex justify-center">
        <span
          className={cn(
            "px-3 text-[11px] font-semibold uppercase tracking-[0.18em]",
            !isConsole && "bg-white/90 text-slate-500",
          )}
          style={
            isConsole
              ? { background: TOKENS.surfaceContainer, color: TOKENS.onSurfaceMuted }
              : undefined
          }
        >
          or
        </span>
      </div>
    </div>
  )
}
