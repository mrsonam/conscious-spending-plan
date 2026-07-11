"use client"

import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { ScrambleCurrencyValue } from "@/components/ui/scramble-number"
import {
  consoleFocus,
  consoleHeroFigureClass,
  consoleHeroFigureInnerClass,
} from "@/components/wealth-console/console-ui"
import { MomChip } from "@/components/wealth-console/mom-chip"
import { HeroSparkline } from "@/components/wealth-console/hero-sparkline"
import {
  expenseMicroLabelClass,
  expenseMicroLabelStyle,
} from "@/components/expenses/expense-console-ui"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { useCountUp } from "@/hooks/use-count-up"
import type { UseExpensePageResult } from "@/hooks/use-expense-page"

type ExpenseSummarySectionProps = {
  p: UseExpensePageResult
  showSummarySkeleton: boolean
  perf: number | null
  reducedMotion: boolean
  onLogOpen: () => void
  onBulkOpen: () => void
}

export function ExpenseSummarySection({
  p,
  showSummarySkeleton,
  perf,
  reducedMotion,
  onLogOpen,
  onBulkOpen,
}: ExpenseSummarySectionProps) {
  const animatedSpend = useCountUp(p.expenseStats.currentMonthTotal)
  const sparklineValues = p.expenseStats.monthlyTotals.map((t) => t.total)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
      <section
        className="lg:col-span-8"
        aria-labelledby="expense-summary-heading"
      >
        <div className="px-1 py-2 sm:px-2">
          <h2 id="expense-summary-heading" className="sr-only">
            This month
          </h2>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: TOKENS.primary, boxShadow: CARD_INSET }}
                aria-hidden
              />
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.28em]"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Live capital outflow
              </p>
            </div>
            <MomChip pct={perf} positiveIsGood={false} />
          </div>

          <div className={cn("mt-4", consoleHeroFigureClass)}>
            {showSummarySkeleton ? (
              <ScrambleCurrencyValue
                variant="loss"
                min={400}
                max={5400}
                className={consoleHeroFigureInnerClass}
              />
            ) : (
              <MajorFigureCurrency
                amount={animatedSpend}
                variant="loss"
                className={consoleHeroFigureInnerClass}
              />
            )}
          </div>

          <div className="mt-4">
            <p className={expenseMicroLabelClass} style={expenseMicroLabelStyle()}>
              YTD aggregate
            </p>
            {showSummarySkeleton ? (
              <div className="mt-2 text-lg font-semibold tabular-nums">
                <ScrambleCurrencyValue
                  min={3000}
                  max={48000}
                  className="font-semibold!"
                />
              </div>
            ) : (
              <>
                <p
                  className="mt-2 text-lg font-semibold tabular-nums"
                  style={{ color: TOKENS.onSurface }}
                >
                  {p.formatCurrency(p.expenseStats.ytdTotal)}
                </p>
                <HeroSparkline
                  values={sparklineValues}
                  reducedMotion={reducedMotion}
                  ariaLabel="Six-month spend trend"
                />
              </>
            )}
          </div>
        </div>
      </section>

      <section className="lg:col-span-4" aria-labelledby="expense-command-heading">
        <div
          className="rounded-xl border p-6 sm:p-7"
          style={{
            background: TOKENS.surfaceContainer,
            borderColor: TOKENS.outlineGhost,
            boxShadow: CARD_INSET,
          }}
        >
          <h2
            id="expense-command-heading"
            className="text-[10px] font-semibold uppercase tracking-[0.28em]"
            style={{ color: TOKENS.onSurfaceMuted }}
          >
            Command actions
          </h2>
          <p
            className="mt-3 text-sm leading-snug"
            style={{ color: TOKENS.onSurfaceMuted }}
          >
            Record a withdrawal from an account, tag it to a fund pillar, and
            optionally set an expense type.
          </p>

          <button
            type="button"
            onClick={onLogOpen}
            disabled={p.loadingAccounts}
            className={cn(
              "mt-5 inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-xl py-3.5 text-xs font-bold uppercase tracking-[0.2em] transition-opacity hover:opacity-95",
              consoleFocus,
            )}
            style={{
              background: TOKENS.primary,
              color: TOKENS.surface,
              boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
            }}
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            {p.loadingAccounts ? "Connecting accounts..." : "Log new expense"}
          </button>

          <button
            type="button"
            onClick={onBulkOpen}
            disabled={p.loadingAccounts}
            className={cn(
              "mt-3 w-full min-h-11 rounded-xl border py-3 text-center text-[10px] font-bold uppercase tracking-[0.18em] transition-opacity hover:opacity-90",
              consoleFocus,
            )}
            style={{
              borderColor: TOKENS.outlineGhost,
              color: TOKENS.onSurfaceMuted,
            }}
          >
            {p.loadingAccounts ? "Waiting for accounts..." : "Bulk import"}
          </button>
        </div>
      </section>
    </div>
  )
}
