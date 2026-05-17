"use client"

import dynamic from "next/dynamic"
import { PieChart as PieChartIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  ScrambleCurrencyValue,
  ScramblePercentValue,
} from "@/components/ui/scramble-number"
import {
  expenseConsoleButtonClass,
  expenseMicroLabelClass,
  expenseMicroLabelStyle,
} from "@/components/expenses/expense-console-ui"
import { ExpenseCategoryLedger } from "@/components/expenses/expense-category-ledger"
import type { CategoryChartEntry } from "@/components/expenses/expense-category-chart"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import type { UseExpensePageResult } from "@/hooks/use-expense-page"

const ExpenseCategoryChart = dynamic(
  () =>
    import("@/components/expenses/expense-category-chart").then(
      (m) => m.ExpenseCategoryChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="mx-auto aspect-square w-full max-w-[280px] min-h-[200px] rounded-full"
        style={{ background: TOKENS.surfaceContainer, maxHeight: 280 }}
        aria-hidden
      />
    ),
  },
)

export type ExpenseCategorySectionProps = {
  p: UseExpensePageResult
  showSummarySkeleton: boolean
  leadCategory: CategoryChartEntry | null
  classifiedSharePct: number
  unclassifiedSharePct: number
  averageEntryAmount: number
  categoryChartData: CategoryChartEntry[]
  shareChartData: CategoryChartEntry[]
  selectedSubcategory: string | null
  onSelectSubcategory: (category: string) => void
  activeSubcategory: CategoryChartEntry | null
  onOpenHistoryForCategory: (category: string) => void
}

export function ExpenseCategorySection({
  p,
  showSummarySkeleton,
  leadCategory,
  classifiedSharePct,
  unclassifiedSharePct,
  averageEntryAmount,
  categoryChartData,
  shareChartData,
  selectedSubcategory,
  onSelectSubcategory,
  activeSubcategory,
  onOpenHistoryForCategory,
}: ExpenseCategorySectionProps) {
  return (
    <section
      className="rounded-[1.75rem] border p-5 sm:p-7"
      style={{
        background: TOKENS.surfaceContainer,
        borderColor: TOKENS.outlineGhost,
        boxShadow: CARD_INSET,
      }}
      aria-labelledby="expense-category-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
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
        </div>
        <dl
          className="grid min-w-[13rem] grid-cols-2 gap-px overflow-hidden rounded-xl border sm:grid-cols-3"
          style={{
            borderColor: TOKENS.outlineGhost,
            background: TOKENS.outlineGhost,
          }}
        >
          <div className="px-4 py-3" style={{ background: TOKENS.surfaceContainer }}>
            <dt className={expenseMicroLabelClass} style={expenseMicroLabelStyle()}>
              Top bucket
            </dt>
            <dd className="mt-2 text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
              {leadCategory?.label ?? "None"}
            </dd>
          </div>
          <div className="px-4 py-3" style={{ background: TOKENS.surfaceContainer }}>
            <dt className={expenseMicroLabelClass} style={expenseMicroLabelStyle()}>
              Tagged spend
            </dt>
            <dd className="mt-2 text-sm font-semibold tabular-nums" style={{ color: TOKENS.onSurface }}>
              {classifiedSharePct.toFixed(0)}%
            </dd>
          </div>
          <div
            className="col-span-2 px-4 py-3 sm:col-span-1"
            style={{ background: TOKENS.surfaceContainer }}
          >
            <dt className={expenseMicroLabelClass} style={expenseMicroLabelStyle()}>
              Avg ticket
            </dt>
            <dd className="mt-2 text-sm font-semibold tabular-nums" style={{ color: TOKENS.onSurface }}>
              {p.formatCurrency(averageEntryAmount)}
            </dd>
          </div>
        </dl>
      </div>

      {showSummarySkeleton ? (
        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div
            className="rounded-[1.5rem] border p-4 sm:p-5"
            style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceLow }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={expenseMicroLabelClass} style={expenseMicroLabelStyle()}>
                  Share of spend
                </p>
                <p className="mt-2 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
                  Loading category distribution.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-col items-center gap-5">
              <div
                className="mx-auto aspect-square w-full max-w-[280px] min-h-[200px] rounded-full"
                style={{ maxHeight: 280, background: TOKENS.surfaceContainer }}
              />
              <div
                className="grid w-full grid-cols-2 gap-3 rounded-[1.25rem] border p-4"
                style={{
                  borderColor: TOKENS.outlineGhost,
                  background: TOKENS.surfaceContainer,
                }}
              >
                <div>
                  <p className={expenseMicroLabelClass} style={expenseMicroLabelStyle()}>
                    Spend
                  </p>
                  <div className="mt-2 text-sm font-semibold tabular-nums">
                    <ScrambleCurrencyValue min={120} max={1800} className="font-semibold!" />
                  </div>
                </div>
                <div>
                  <p className={expenseMicroLabelClass} style={expenseMicroLabelStyle()}>
                    Share
                  </p>
                  <div className="mt-2 text-sm font-semibold tabular-nums">
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

          <div className="grid grid-cols-1 gap-6">
            <div
              className="rounded-[1.5rem] border p-4 sm:p-5"
              style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceLow }}
            >
              <p className={expenseMicroLabelClass} style={expenseMicroLabelStyle()}>
                Category ledger
              </p>
              <div className="mt-4 space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="grid w-full grid-cols-[auto_1fr_auto_auto] items-center gap-3 rounded-xl border px-3 py-3"
                    style={{
                      borderColor: TOKENS.outlineGhost,
                      background: "transparent",
                    }}
                  >
                    <span
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{
                        color: TOKENS.primary,
                        background: TOKENS.surfaceContainer,
                        border: `1px solid ${TOKENS.outlineGhost}`,
                      }}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <div
                        className="h-4 w-28 rounded-md"
                        style={{ background: TOKENS.surfaceContainer }}
                      />
                      <div
                        className="mt-2 h-3 w-16 rounded-md"
                        style={{ background: TOKENS.surfaceContainer }}
                      />
                    </div>
                    <div className="text-right">
                      <ScrambleCurrencyValue min={50} max={1200} className="text-sm font-semibold!" />
                    </div>
                    <div className="text-right">
                      <ScramblePercentValue
                        className="text-sm font-semibold tabular-nums"
                        color={TOKENS.onSurface}
                        min={4}
                        max={34}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : categoryChartData.length === 0 ? (
        <div
          className="mt-6 rounded-2xl border px-5 py-12 text-center"
          style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceLow }}
        >
          <p className="text-base font-semibold" style={{ color: TOKENS.onSurface }}>
            No tagged sub-categories yet
          </p>
          <p className="mt-2 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
            Add expense types to your entries and this chart view will populate automatically.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div
            className="rounded-[1.5rem] border p-4 sm:p-5"
            style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceLow }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={expenseMicroLabelClass} style={expenseMicroLabelStyle()}>
                  Share of spend
                </p>
                <p className="mt-2 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
                  Click a slice to spotlight a category and jump to its ledger history.
                </p>
              </div>
              {activeSubcategory && activeSubcategory.category !== "unclassified" ? (
                <button
                  type="button"
                  onClick={() => onOpenHistoryForCategory(activeSubcategory.category)}
                  className={cn(
                    "min-h-11 rounded-lg border px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.18em]",
                    expenseConsoleButtonClass,
                  )}
                  style={{
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.primary,
                    background: TOKENS.surfaceContainer,
                  }}
                >
                  View in history
                </button>
              ) : null}
            </div>
            <div className="mt-4 flex flex-col items-center gap-5">
              <ExpenseCategoryChart
                data={shareChartData}
                selectedCategory={selectedSubcategory}
                onSelectCategory={onSelectSubcategory}
                activeEntry={activeSubcategory}
                formatCurrency={p.formatCurrency}
              />
              <dl
                className="grid w-full grid-cols-2 gap-4 border-t pt-4"
                style={{ borderColor: TOKENS.outlineGhost }}
              >
                <div>
                  <dt className={expenseMicroLabelClass} style={expenseMicroLabelStyle()}>
                    Tagged
                  </dt>
                  <dd
                    className="mt-2 text-sm font-semibold tabular-nums"
                    style={{ color: TOKENS.onSurface }}
                  >
                    {classifiedSharePct.toFixed(0)}%
                  </dd>
                </div>
                <div>
                  <dt className={expenseMicroLabelClass} style={expenseMicroLabelStyle()}>
                    Unclassified
                  </dt>
                  <dd
                    className="mt-2 text-sm font-semibold tabular-nums"
                    style={{ color: TOKENS.onSurface }}
                  >
                    {unclassifiedSharePct.toFixed(0)}%
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <ExpenseCategoryLedger
            categories={categoryChartData}
            selectedCategory={selectedSubcategory}
            onSelectCategory={onSelectSubcategory}
            formatCurrency={p.formatCurrency}
          />
        </div>
      )}
    </section>


  )
}
