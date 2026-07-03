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
import { consoleFocus, consoleMicroLabel } from "@/components/wealth-console/console-ui"

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
  hint: string
  icon: React.ReactNode
  accent: string
  onClick: () => void
}

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
      label: "Log income",
      hint: "Pay & deposits",
      icon: <Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden />,
      accent: TOKENS.primary,
      onClick: onLogIncome,
    },
    {
      label: "Log expense",
      hint: "Spend & bills",
      icon: <Minus className="h-4 w-4" strokeWidth={2.25} aria-hidden />,
      accent: TOKENS.loss,
      onClick: onLogExpense,
    },
    {
      label: "Transfer",
      hint: "Between accounts",
      icon: <ArrowLeftRight className="h-4 w-4" strokeWidth={2.25} aria-hidden />,
      accent: TOKENS.secondary,
      onClick: onTransfer,
    },
    {
      label: "Log super",
      hint: "Retirement fund",
      icon: <Shield className="h-4 w-4" strokeWidth={2.25} aria-hidden />,
      accent: TOKENS.warning,
      onClick: onLogSuper,
    },
    {
      label: "Investment",
      hint: "Buy or top up",
      icon: <TrendingUp className="h-4 w-4" strokeWidth={2.25} aria-hidden />,
      accent: TOKENS.tertiary,
      onClick: onLogInvestment,
    },
  ]

  return (
    <section
      id="console-quick-actions"
      className={cn("scroll-mt-28 space-y-5", className)}
      aria-labelledby="console-quick-actions-heading"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{
              background: TOKENS.surfaceLow,
              color: TOKENS.warning,
            }}
          >
            <Zap className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p
              id="console-quick-actions-heading"
              className="text-[10px] font-semibold uppercase tracking-[0.22em]"
              style={consoleMicroLabel}
            >
              Quick actions
            </p>
            <p
              className="mt-1 max-w-2xl text-xs leading-relaxed"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Record activity without leaving the console
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto pb-0.5 scrollbar-none sm:overflow-visible">
        <div className="flex min-w-max gap-4 sm:grid sm:min-w-0 sm:grid-cols-2 lg:grid-cols-5 lg:gap-5">
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className={cn(
                  consoleFocus,
                  "group flex min-h-[4.75rem] min-w-[10.5rem] flex-1 flex-col justify-between rounded-xl border px-3.5 py-3.5 text-left transition-[background-color,border-color,transform] duration-200 hover:bg-white/[0.04] motion-reduce:transition-none sm:min-w-0",
                  "active:scale-[0.99] motion-reduce:active:scale-100",
                )}
                style={{
                  background: TOKENS.surfaceLow,
                  borderColor: TOKENS.outlineGhost,
                  boxShadow: CARD_INSET,
                }}
              >
                <span className="flex items-start justify-between gap-2">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 motion-reduce:transition-none"
                    style={{
                      background: `color-mix(in srgb, ${action.accent} 14%, ${TOKENS.surfaceContainer})`,
                      color: action.accent,
                    }}
                  >
                    {action.icon}
                  </span>
                  <span
                    className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100 motion-reduce:transition-none"
                    style={{ background: action.accent }}
                    aria-hidden
                  />
                </span>
                <span className="mt-3 block min-w-0">
                  <span
                    className="block text-sm font-semibold leading-snug transition-colors duration-200 group-hover:text-white motion-reduce:transition-none"
                    style={{ color: TOKENS.onSurface }}
                  >
                    {action.label}
                  </span>
                  <span
                    className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.16em]"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    {action.hint}
                  </span>
                </span>
              </button>
          ))}
        </div>
      </div>
    </section>
  )
}
