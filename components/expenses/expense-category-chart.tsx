"use client"

import { RadialRing } from "@/components/wealth-console/radial-ring"
import { TOKENS } from "@/lib/wealth-console-tokens"

export type CategoryChartEntry = {
  category: string
  label: string
  amount: number
  sharePct: number
  fill: string
  count?: number
  /** null = brand new category this month (no prior-month baseline). */
  momentumPct?: number | null
}

type ExpenseCategoryChartProps = {
  data: CategoryChartEntry[]
  totalAmount: string
  selectedCategory: string | null
  onSelectCategory: (category: string) => void
  activeEntry: CategoryChartEntry | null
  reducedMotion: boolean
  formatCurrency: (amount: number) => string
}

export function ExpenseCategoryChart({
  data,
  totalAmount,
  selectedCategory,
  onSelectCategory,
  activeEntry,
  reducedMotion,
  formatCurrency,
}: ExpenseCategoryChartProps) {
  return (
    <>
      <p id="expense-chart-keyboard-hint" className="sr-only">
        The ring chart is mouse-only. Use the category buttons in the ledger
        list to select a category with the keyboard.
      </p>
      <div
        className="mx-auto flex w-full max-w-[280px] justify-center py-2"
        aria-describedby="expense-chart-keyboard-hint"
      >
        <RadialRing
          segments={data.map((entry) => ({
            key: entry.category,
            sharePct: entry.sharePct,
            color: entry.fill,
          }))}
          totalAmount={totalAmount}
          reducedMotion={reducedMotion}
          selectedKey={selectedCategory}
          onSelectKey={onSelectCategory}
          ariaLabel={`Spend by sub-category: ${data
            .map((entry) => `${entry.label} ${entry.sharePct.toFixed(1)}%`)
            .join(", ")}`}
        />
      </div>

      <table className="sr-only">
        <caption>Spend by sub-category this month</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Amount</th>
            <th scope="col">Share</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.category}>
              <td>{row.label}</td>
              <td>{formatCurrency(row.amount)}</td>
              <td>{row.sharePct.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      {activeEntry ? (
        <div className="flex w-full items-center justify-center gap-3 text-center">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: activeEntry.fill }}
            aria-hidden
          />
          <p className="text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
            {activeEntry.label}
          </p>
          <span style={{ color: TOKENS.onSurfaceMuted }} aria-hidden>
            ·
          </span>
          <p className="text-sm font-semibold tabular-nums" style={{ color: TOKENS.onSurface }}>
            {formatCurrency(activeEntry.amount)}
          </p>
          <span
            className="text-sm tabular-nums"
            style={{ color: TOKENS.onSurfaceMuted }}
          >
            {activeEntry.sharePct.toFixed(1)}%
          </span>
        </div>
      ) : null}
    </>
  )
}
