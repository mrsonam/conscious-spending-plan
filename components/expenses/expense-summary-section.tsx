"use client"

import { Plus, Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { ScrambleCurrencyValue } from "@/components/ui/scramble-number"
import { AppSelect } from "@/components/ui/app-select"
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
import { INCOME_PAGE_ERROR_SOFT as PULSE_RED } from "@/lib/income-page-types"
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
  const selectedMonthLabel =
    p.monthOptions.find((o) => o.month === p.selectedMonth && o.year === p.selectedYear)?.label ??
    new Date(p.selectedYear, p.selectedMonth - 1).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    })

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
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: TOKENS.loss, boxShadow: CARD_INSET }}
              aria-hidden
            />
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.28em]"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Live capital outflow · {selectedMonthLabel}
            </p>
          </div>

          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div className={consoleHeroFigureClass}>
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
            <MomChip pct={perf} positiveIsGood={false} />
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
                  color={TOKENS.loss}
                  formatValue={p.formatCurrency}
                  ariaLabel="Six-month spend trend"
                />
              </>
            )}
          </div>
        </div>
      </section>

      <section
        className="flex flex-col items-stretch gap-2.5 sm:items-end lg:col-span-4"
        aria-labelledby="expense-command-heading"
      >
        <h2 id="expense-command-heading" className="sr-only">
          Command actions
        </h2>
        <label htmlFor="expense-summary-period" className="sr-only">
          Statement period
        </label>
        <AppSelect
          id="expense-summary-period"
          value={`${p.selectedYear}-${p.selectedMonth}`}
          onValueChange={(v) => {
            const [y, m] = v.split("-").map(Number)
            p.setSelectedYear(y)
            p.setSelectedMonth(m)
          }}
          className="border-transparent"
          triggerClassName="h-10 w-40"
          style={{
            backgroundColor: TOKENS.surfaceLow,
            borderColor: TOKENS.outlineGhost,
            color: TOKENS.onSurface,
          }}
          options={p.monthOptions.map((opt) => ({ value: opt.value, label: opt.label }))}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBulkOpen}
            disabled={p.loadingAccounts}
            className={cn(
              "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border px-3.5 text-xs font-bold uppercase tracking-[0.12em] transition-[background-color,transform] duration-150 hover:bg-white/6 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100",
              consoleFocus,
            )}
            style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurfaceMuted }}
          >
            <Upload className="h-3.5 w-3.5" strokeWidth={2.25} />
            {p.loadingAccounts ? "Waiting…" : "Bulk"}
          </button>
          <button
            type="button"
            onClick={onLogOpen}
            disabled={p.loadingAccounts}
            className={cn(
              "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-bold uppercase tracking-[0.12em] transition-[opacity,transform] duration-150 hover:opacity-95 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100",
              consoleFocus,
            )}
            style={{ background: PULSE_RED, color: TOKENS.surface }}
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            {p.loadingAccounts ? "Connecting…" : "Log spend"}
          </button>
        </div>
      </section>
    </div>
  )
}
