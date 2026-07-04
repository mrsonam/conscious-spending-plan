"use client"

import { Plus, TrendingDown, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import {
  ScrambleCurrencyValue,
  ScramblePercentValue,
} from "@/components/ui/scramble-number"
import {
  consoleFocus,
  consoleHeroFigureClass,
  consoleHeroFigureInnerClass,
} from "@/components/wealth-console/console-ui"
import {
  expenseMicroLabelClass,
  expenseMicroLabelStyle,
} from "@/components/expenses/expense-console-ui"
import { SegmentedBlocks } from "@/components/expenses/expense-shared"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "@/lib/income-page-types"
import type { UseExpensePageResult } from "@/hooks/use-expense-page"

type ExpenseSummarySectionProps = {
  p: UseExpensePageResult
  showSummarySkeleton: boolean
  perf: number | null
  perfGood: boolean
  fixedPct: number
  investPct: number
  fixedOver: boolean
  investOver: boolean
  fixedThreshold: number
  investTarget: number
  onLogOpen: () => void
  onBulkOpen: () => void
}

export function ExpenseSummarySection({
  p,
  showSummarySkeleton,
  perf,
  perfGood,
  fixedPct,
  investPct,
  fixedOver,
  investOver,
  fixedThreshold,
  investTarget,
  onLogOpen,
  onBulkOpen,
}: ExpenseSummarySectionProps) {
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
            <div
              className="inline-flex items-center rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
              style={{
                background: `color-mix(in srgb, ${TOKENS.primary} 18%, ${TOKENS.surfaceLow})`,
                border: `1px solid ${TOKENS.outlineGhost}`,
                color: TOKENS.primary,
                boxShadow: CARD_INSET,
              }}
            >
              {perf !== null ? (
                <>
                  {perfGood ? (
                    <TrendingDown className="mr-2 h-4 w-4" strokeWidth={2} />
                  ) : (
                    <TrendingUp className="mr-2 h-4 w-4" strokeWidth={2} />
                  )}
                  {perfGood ? "" : "+"}
                  {perf.toFixed(1)}% vs prev. month
                </>
              ) : (
                <span>-</span>
              )}
            </div>
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
                amount={p.expenseStats.currentMonthTotal}
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
              <p
                className="mt-2 text-lg font-semibold tabular-nums"
                style={{ color: TOKENS.onSurface }}
              >
                {p.formatCurrency(p.expenseStats.ytdTotal)}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div
            className="rounded-xl border p-5"
            style={{
              background: TOKENS.surfaceContainer,
              borderColor: TOKENS.outlineGhost,
              boxShadow: CARD_INSET,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={expenseMicroLabelClass} style={expenseMicroLabelStyle()}>
                  Fixed overhead
                </p>
                <p
                  className="mt-1 text-xs italic"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Fixed recurring outflows
                </p>
              </div>
              {showSummarySkeleton ? (
                <ScramblePercentValue
                  className="text-lg font-bold tabular-nums"
                  color={TOKENS.onSurface}
                  min={18}
                  max={82}
                />
              ) : (
                <p
                  className="text-lg font-bold tabular-nums"
                  style={{ color: TOKENS.onSurface }}
                >
                  {Number.isFinite(fixedPct) ? fixedPct.toFixed(0) : "0"}%
                </p>
              )}
            </div>
            <SegmentedBlocks percent={fixedPct} activeColor={TOKENS.secondary} />
            <div className="mt-4 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider">
              <span style={{ color: TOKENS.onSurfaceMuted }}>
                Threshold {fixedThreshold.toFixed(0)}%
              </span>
              <span style={{ color: fixedOver ? ERROR_SOFT : TOKENS.primary }}>
                {fixedOver ? "Over threshold" : "Optimized"}
              </span>
            </div>
          </div>

          <div
            className="rounded-xl border p-5"
            style={{
              background: TOKENS.surfaceContainer,
              borderColor: TOKENS.outlineGhost,
              boxShadow: CARD_INSET,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={expenseMicroLabelClass} style={expenseMicroLabelStyle()}>
                  Investment capital
                </p>
                <p
                  className="mt-1 text-xs italic"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Growth-focused deployments
                </p>
              </div>
              {showSummarySkeleton ? (
                <ScramblePercentValue
                  className="text-lg font-bold tabular-nums"
                  color={TOKENS.onSurface}
                  min={6}
                  max={44}
                />
              ) : (
                <p
                  className="text-lg font-bold tabular-nums"
                  style={{ color: TOKENS.onSurface }}
                >
                  {Number.isFinite(investPct) ? investPct.toFixed(0) : "0"}%
                </p>
              )}
            </div>
            <SegmentedBlocks percent={investPct} activeColor={TOKENS.primary} />
            <div className="mt-4 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider">
              <span style={{ color: TOKENS.onSurfaceMuted }}>
                Strategic allocation {investTarget.toFixed(0)}%
              </span>
              <span style={{ color: investOver ? ERROR_SOFT : TOKENS.primary }}>
                {investOver ? "Over threshold" : "Optimized"}
              </span>
            </div>
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
