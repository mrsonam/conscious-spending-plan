"use client"

import { Minus, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { consoleFocus } from "@/components/wealth-console/console-ui"

type ConsoleQuickActionsProps = {
  onLogIncome: () => void
  onLogExpense: () => void
  className?: string
}

const actionButtonClass = cn(
  consoleFocus,
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] transition-opacity duration-200 hover:opacity-90"
)

export function ConsoleQuickActions({
  onLogIncome,
  onLogExpense,
  className,
}: ConsoleQuickActionsProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between",
        className
      )}
    >
      <div>
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: TOKENS.onSurfaceMuted }}
        >
          Quick log
        </p>
        <p className="mt-1 text-sm leading-snug" style={{ color: TOKENS.onSurfaceMutedElevated }}>
          Record inflows or spending without leaving the console.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onLogIncome}
          className={actionButtonClass}
          style={{
            background: TOKENS.primary,
            color: TOKENS.surface,
            boxShadow: CARD_INSET,
          }}
        >
          <Plus className="h-4 w-4 shrink-0" aria-hidden />
          Log income
        </button>
        <button
          type="button"
          onClick={onLogExpense}
          className={actionButtonClass}
          style={{
            border: `1px solid ${TOKENS.outlineGhost}`,
            background: TOKENS.surfaceContainer,
            color: TOKENS.onSurface,
            boxShadow: CARD_INSET,
          }}
        >
          <Minus className="h-4 w-4 shrink-0" aria-hidden />
          Log expense
        </button>
      </div>
    </div>
  )
}
