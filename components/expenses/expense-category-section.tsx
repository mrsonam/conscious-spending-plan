"use client"

import { PieChart as PieChartIcon } from "lucide-react"
import {
  ScrambleCurrencyValue,
  ScramblePercentValue,
} from "@/components/ui/scramble-number"
import {
  expenseMicroLabelClass,
  expenseMicroLabelStyle,
} from "@/components/expenses/expense-console-ui"
import { ExpenseCategoryLedger } from "@/components/expenses/expense-category-ledger"
import {
  ExpenseCategoryChart,
  type CategoryChartEntry,
} from "@/components/expenses/expense-category-chart"
import { MomentumCell } from "@/components/wealth-console/momentum-cell"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import { TOKENS } from "@/lib/wealth-console-tokens"
import type { UseExpensePageResult } from "@/hooks/use-expense-page"

export type ExpenseCategorySectionProps = {
  p: UseExpensePageResult
  showSummarySkeleton: boolean
  topThreeSharePct: number
  totalTransactions: number
  categoryCount: number
  biggestMover: CategoryChartEntry | null
  averageEntryAmount: number
  categoryChartData: CategoryChartEntry[]
  shareChartData: CategoryChartEntry[]
  selectedSubcategory: string | null
  onSelectSubcategory: (category: string) => void
  activeSubcategory: CategoryChartEntry | null
}

export function ExpenseCategorySection({
  p,
  showSummarySkeleton,
  topThreeSharePct,
  totalTransactions,
  categoryCount,
  biggestMover,
  averageEntryAmount,
  categoryChartData,
  shareChartData,
  selectedSubcategory,
  onSelectSubcategory,
  activeSubcategory,
}: ExpenseCategorySectionProps) {
  const reducedMotion = usePrefersReducedMotion()
  const chartTotal = shareChartData.reduce((sum, entry) => sum + entry.amount, 0)

  return (
    <section className="px-1 py-2 sm:px-2" aria-labelledby="expense-category-heading">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <h2
          id="expense-category-heading"
          className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl"
          style={{ color: TOKENS.onSurface }}
        >
          <PieChartIcon
            className="h-4 w-4 shrink-0"
            style={{ color: TOKENS.primary }}
            strokeWidth={2}
            aria-hidden
          />
          Spend by sub-category
        </h2>
        <dl className="flex flex-wrap gap-x-7 gap-y-2">
          <div>
            <dt className={expenseMicroLabelClass} style={expenseMicroLabelStyle()}>
              Top 3 share
            </dt>
            <dd className="mt-1 text-sm font-semibold tabular-nums" style={{ color: TOKENS.onSurface }}>
              {topThreeSharePct.toFixed(0)}%
            </dd>
          </div>
          <div>
            <dt className={expenseMicroLabelClass} style={expenseMicroLabelStyle()}>
              Transactions
            </dt>
            <dd className="mt-1 text-sm font-semibold tabular-nums" style={{ color: TOKENS.onSurface }}>
              {totalTransactions}
            </dd>
          </div>
          <div>
            <dt className={expenseMicroLabelClass} style={expenseMicroLabelStyle()}>
              Avg ticket
            </dt>
            <dd className="mt-1 text-sm font-semibold tabular-nums" style={{ color: TOKENS.onSurface }}>
              {p.formatCurrency(averageEntryAmount)}
            </dd>
          </div>
        </dl>
      </div>

      {showSummarySkeleton ? (
        <div
          className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-[0.85fr_1.15fr] xl:divide-x"
          style={{ borderColor: TOKENS.outlineGhost }}
        >
          <div className="xl:pr-8">
            <p className="text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
              Loading category distribution.
            </p>
            <div className="mt-5 flex flex-col items-center gap-5">
              <div
                className="mx-auto h-[168px] w-[168px] rounded-full"
                style={{ background: TOKENS.surfaceHigh }}
              />
              <div className="flex w-full items-center justify-center gap-10 border-t pt-4" style={{ borderColor: TOKENS.outlineGhost }}>
                <div className="text-center">
                  <p className={expenseMicroLabelClass} style={expenseMicroLabelStyle()}>
                    Spend
                  </p>
                  <div className="mt-1 text-sm font-semibold tabular-nums">
                    <ScrambleCurrencyValue min={120} max={1800} className="font-semibold!" />
                  </div>
                </div>
                <div className="text-center">
                  <p className={expenseMicroLabelClass} style={expenseMicroLabelStyle()}>
                    Share
                  </p>
                  <div className="mt-1 text-sm font-semibold tabular-nums">
                    <ScramblePercentValue
                      className="text-sm font-semibold tabular-nums"
                      color={TOKENS.onSurface}
                      min={8}
                      max={64}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="xl:pl-8">
            <p className={expenseMicroLabelClass} style={expenseMicroLabelStyle()}>
              Category ledger
            </p>
            <div className="mt-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="grid w-full grid-cols-[1.75rem_1fr_3.25rem_5rem_4.5rem] items-center gap-3 py-3.5"
                  style={{
                    borderBottom: index < 3 ? `1px solid ${TOKENS.outlineGhost}` : undefined,
                  }}
                >
                  <span
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{ color: TOKENS.primary, background: TOKENS.surfaceHigh }}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="h-4 w-28 rounded-md" style={{ background: TOKENS.surfaceHigh }} />
                    <div className="mt-2 h-3 w-16 rounded-md" style={{ background: TOKENS.surfaceHigh }} />
                  </div>
                  <div className="text-right">
                    <ScramblePercentValue
                      className="text-sm font-semibold tabular-nums"
                      color={TOKENS.onSurface}
                      min={4}
                      max={34}
                    />
                  </div>
                  <div className="text-right">
                    <ScrambleCurrencyValue min={50} max={1200} className="text-sm font-semibold!" />
                  </div>
                  <div className="h-3 w-10 rounded-md" style={{ background: TOKENS.surfaceHigh }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : categoryChartData.length === 0 ? (
        <div className="mt-8 py-10 text-center">
          <p className="text-base font-semibold" style={{ color: TOKENS.onSurface }}>
            No tagged sub-categories yet
          </p>
          <p className="mt-2 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
            Add expense types to your entries and this chart view will populate automatically.
          </p>
        </div>
      ) : (
        <div
          className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-[0.85fr_1.15fr] xl:divide-x"
          style={{ borderColor: TOKENS.outlineGhost }}
        >
          <div className="xl:pr-8">
            <div className="flex flex-col items-center gap-5">
              <ExpenseCategoryChart
                data={shareChartData}
                totalAmount={p.formatCurrency(chartTotal)}
                selectedCategory={selectedSubcategory}
                onSelectCategory={onSelectSubcategory}
                activeEntry={activeSubcategory}
                reducedMotion={reducedMotion}
                formatCurrency={p.formatCurrency}
              />
              <dl
                className="flex w-full items-center justify-center gap-10 border-t pt-4"
                style={{ borderColor: TOKENS.outlineGhost }}
              >
                <div className="text-center">
                  <dt className={expenseMicroLabelClass} style={expenseMicroLabelStyle()}>
                    Categories
                  </dt>
                  <dd
                    className="mt-1 text-sm font-semibold tabular-nums"
                    style={{ color: TOKENS.onSurface }}
                  >
                    {categoryCount}
                  </dd>
                </div>
                {biggestMover ? (
                  <div className="text-center">
                    <dt className={expenseMicroLabelClass} style={expenseMicroLabelStyle()}>
                      Biggest mover
                    </dt>
                    <dd className="mt-1 flex items-center justify-center gap-2">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: TOKENS.onSurface }}
                      >
                        {biggestMover.label}
                      </span>
                      <MomentumCell
                        pct={biggestMover.momentumPct ?? null}
                        isNew={false}
                        positiveIsGood={false}
                      />
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </div>

          <div className="xl:pl-8">
            <p
              id="expense-category-ledger-label"
              className={expenseMicroLabelClass}
              style={expenseMicroLabelStyle()}
            >
              Category ledger
            </p>
            <div className="mt-3">
              <ExpenseCategoryLedger
                categories={categoryChartData}
                selectedCategory={selectedSubcategory}
                onSelectCategory={onSelectSubcategory}
                formatCurrency={p.formatCurrency}
              />
            </div>
          </div>
        </div>
      )}
    </section>


  )
}
