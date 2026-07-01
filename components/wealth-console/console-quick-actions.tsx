"use client"

import {
  ArrowLeftRight,
  Minus,
  Plus,
  Shield,
  TrendingUp,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { consoleFocus } from "@/components/wealth-console/console-ui"

type ConsoleQuickActionsProps = {
  onLogIncome: () => void
  onLogExpense: () => void
  onTransfer: () => void
  onLogSuper: () => void
  onLogInvestment: () => void
  className?: string
}

type ActionDef = {
  label: string
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  onClick: () => void
}

const cardBase = cn(
  consoleFocus,
  "flex flex-col items-center justify-center gap-3 rounded-xl border p-4 transition-colors hover:bg-white/[0.04] cursor-pointer select-none",
  "min-w-[88px] flex-shrink-0 sm:min-w-0 sm:flex-1",
)

export function ConsoleQuickActions({
  onLogIncome,
  onLogExpense,
  onTransfer,
  onLogSuper,
  onLogInvestment,
  className,
}: ConsoleQuickActionsProps) {
  const actions: ActionDef[] = [
    {
      label: "Log Income",
      icon: <Plus className="h-5 w-5" />,
      iconBg: `color-mix(in srgb, ${TOKENS.primary} 18%, transparent)`,
      iconColor: TOKENS.primary,
      onClick: onLogIncome,
    },
    {
      label: "Log Expense",
      icon: <Minus className="h-5 w-5" />,
      iconBg: `color-mix(in srgb, ${TOKENS.loss} 18%, transparent)`,
      iconColor: TOKENS.loss,
      onClick: onLogExpense,
    },
    {
      label: "Transfer",
      icon: <ArrowLeftRight className="h-5 w-5" />,
      iconBg: `color-mix(in srgb, ${TOKENS.secondary} 18%, transparent)`,
      iconColor: TOKENS.secondary,
      onClick: onTransfer,
    },
    {
      label: "Log Super",
      icon: <Shield className="h-5 w-5" />,
      iconBg: `color-mix(in srgb, ${TOKENS.warning} 18%, transparent)`,
      iconColor: TOKENS.warning,
      onClick: onLogSuper,
    },
    {
      label: "Investment",
      icon: <TrendingUp className="h-5 w-5" />,
      iconBg: `color-mix(in srgb, ${TOKENS.tertiary} 18%, transparent)`,
      iconColor: TOKENS.tertiary,
      onClick: onLogInvestment,
    },
  ]

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-1.5">
        <Zap
          className="h-3.5 w-3.5"
          style={{ color: TOKENS.warning }}
          strokeWidth={2.5}
          aria-hidden
        />
        <p
          className="text-[10px] font-bold uppercase tracking-[0.22em]"
          style={{ color: TOKENS.onSurfaceMuted }}
        >
          Quick Actions
        </p>
      </div>

      {/* Scrollable on mobile, row on sm+ */}
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none sm:grid sm:grid-cols-5 sm:overflow-visible sm:pb-0">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className={cardBase}
              style={{
                background: TOKENS.surfaceContainer,
                borderColor: TOKENS.outlineGhost,
                boxShadow: CARD_INSET,
              }}
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ background: action.iconBg }}
                aria-hidden
              >
                <span style={{ color: action.iconColor }}>{action.icon}</span>
              </span>
              <span
                className="text-center text-[11px] font-semibold leading-tight"
                style={{ color: TOKENS.onSurface }}
              >
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
