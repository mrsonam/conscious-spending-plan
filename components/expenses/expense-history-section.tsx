"use client"

import type { RefObject } from "react"
import { Download, Filter, Pencil, Search, TrendingDown, Trash2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { ConsolePaginationBar } from "@/components/wealth-console/console-pagination"
import { consoleFocus } from "@/components/wealth-console/console-ui"
import { ExpenseHistoryFilters } from "@/components/expenses/expense-history-filters"
import {
  expenseLabel,
  fundLabel,
} from "@/components/expenses/expense-shared"
import {
  expenseConsoleField,
  EXPENSE_HISTORY_FILTERS_ID,
} from "@/components/expenses/expense-console-ui"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "@/lib/income-page-types"
import type { UseExpensePageResult } from "@/hooks/use-expense-page"

type ExpenseHistorySectionProps = {
  p: UseExpensePageResult
  sectionRef: RefObject<HTMLElement | null>
  filtersOpen: boolean
  onFiltersOpenChange: (open: boolean) => void
  exportingCsv: boolean
  onExportCsv: () => void
  onEditExpense: (expense: UseExpensePageResult["expenses"][number]) => void
}

export function ExpenseHistorySection({
  p,
  sectionRef,
  filtersOpen,
  onFiltersOpenChange,
  exportingCsv,
  onExportCsv,
  onEditExpense,
}: ExpenseHistorySectionProps) {
  return (
    <section
      ref={sectionRef}
      className="rounded-xl border"
      style={{
        background: TOKENS.surfaceContainer,
        borderColor: TOKENS.outlineGhost,
        boxShadow: CARD_INSET,
      }}
      aria-labelledby="expense-history-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-7">
        <div className="min-w-0">
          <h2
            id="expense-history-heading"
            className="text-base font-semibold tracking-tight"
            style={{ color: TOKENS.onSurface }}
          >
            Financial Transaction History
          </h2>
          <p
            className="mt-1 text-xs"
            style={{ color: TOKENS.onSurfaceMuted }}
          >
            {p.expensesTotal === 0
              ? "No entries in the current range"
              : `Showing ${p.expenses.length} of ${p.expensesTotal} entries`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={cn(
              "inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-lg border transition-colors hover:bg-white/6",
              consoleFocus,
            )}
            style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurfaceMuted }}
            aria-label="Filter"
            aria-expanded={filtersOpen}
            aria-controls={EXPENSE_HISTORY_FILTERS_ID}
            onClick={() => onFiltersOpenChange(!filtersOpen)}
          >
            <Filter className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={cn(
              "inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-lg border transition-colors hover:bg-white/6 disabled:opacity-50",
              consoleFocus,
            )}
            style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurfaceMuted }}
            aria-label="Download CSV"
            disabled={exportingCsv}
            onClick={onExportCsv}
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        className="border-t px-5 py-5 sm:px-7"
        style={{ borderColor: TOKENS.outlineGhost }}
      >
        {/* Search, always visible */}
        <div className="relative mb-4">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: TOKENS.onSurfaceMuted }}
          />
          <input
            type="text"
            id="expense-search"
            value={p.filterSearch}
            onChange={(e) => p.setFilterSearch(e.target.value)}
            placeholder="Search transactions..."
            aria-label="Search expenses"
            className={cn(expenseConsoleField, "pl-9", p.filterSearch ? "pr-8" : "")}
            style={{
              background: TOKENS.surfaceLow,
              borderColor: TOKENS.outlineGhost,
              color: TOKENS.onSurface,
            }}
          />
          {p.filterSearch ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => p.setFilterSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full opacity-50 transition-opacity hover:opacity-100"
              style={{ color: TOKENS.onSurface }}
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </div>

        {filtersOpen ? (
          <div
            id={EXPENSE_HISTORY_FILTERS_ID}
            className="mb-5"
            role="region"
            aria-label="Expense filters"
          >
            <ExpenseHistoryFilters p={p} />
          </div>
        ) : null}

        <div className="mt-5 space-y-2">
          {p.loadingExpenses ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border px-4 py-4"
                  style={{
                    background: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    boxShadow: CARD_INSET,
                  }}
                >
                  <div className="h-4 w-40 rounded bg-white/[0.08]" />
                  <div className="mt-3 h-3 w-56 rounded bg-white/[0.06]" />
                  <div className="mt-2 h-3 w-32 rounded bg-white/[0.06]" />
                </div>
              ))}
            </div>
          ) : p.expenses.length === 0 ? (
            <div className="py-14 text-center">
              <TrendingDown
                className="mx-auto h-12 w-12"
                style={{ color: TOKENS.onSurfaceMuted }}
                strokeWidth={1.25}
              />
              <p
                className="mt-4 text-base font-semibold"
                style={{ color: TOKENS.onSurface }}
              >
                No rows in this range
              </p>
              <p
                className="mt-2 text-sm"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Log an expense or adjust filters.
              </p>
            </div>
          ) : (
            p.expenses.map((expense) => (
              <div
                key={expense.id}
                className="flex flex-col gap-3 rounded-xl border px-4 py-4 transition-colors hover:bg-white/4 sm:flex-row sm:items-center sm:justify-between"
                style={{
                  background: TOKENS.surfaceLow,
                  borderColor: TOKENS.outlineGhost,
                  boxShadow: CARD_INSET,
                }}
              >
                <div className="min-w-0">
                  <p
                    className="truncate text-sm font-semibold tracking-tight"
                    style={{ color: TOKENS.onSurface }}
                  >
                    {expense.description?.trim() || "Unlabeled transaction"}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {expense.category && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                        style={{
                          background: `color-mix(in srgb, ${TOKENS.secondary} 16%, ${TOKENS.surfaceHigh})`,
                          color: TOKENS.secondary,
                          border: `1px solid ${TOKENS.outlineGhost}`,
                        }}
                      >
                        {fundLabel(expense.category)}
                      </span>
                    )}
                    {expense.expenseCategory && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                        style={{
                          background: `color-mix(in srgb, ${TOKENS.loss} 18%, ${TOKENS.surfaceHigh})`,
                          color: TOKENS.loss,
                          border: `1px solid ${TOKENS.outlineGhost}`,
                        }}
                      >
                        {expenseLabel(expense.expenseCategory)}
                      </span>
                    )}
                    {!expense.category && !expense.expenseCategory && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                        style={{
                          background: TOKENS.surfaceHigh,
                          color: TOKENS.onSurfaceMuted,
                          border: `1px solid ${TOKENS.outlineGhost}`,
                        }}
                      >
                        Unclassified
                      </span>
                    )}
                    <span
                      className="text-xs tabular-nums"
                      style={{ color: TOKENS.onSurfaceMuted }}
                    >
                      {p.formatDate(expense.date)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div className="text-left sm:text-right">
                    <MajorFigureCurrency
                      amount={expense.amount}
                      variant="loss"
                      className="text-base font-bold!"
                      decimalEm={0.45}
                    />
                    <p
                      className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                      style={{ color: TOKENS.onSurfaceMuted }}
                    >
                      {expense.account.name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEditExpense(expense)}
                    className={cn(
                      "inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.06]",
                      consoleFocus,
                    )}
                    style={{ color: TOKENS.onSurfaceMuted }}
                    aria-label={`Edit expense ${expense.description?.trim() || "transaction"}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => p.handleDelete(expense.id)}
                    className={cn(
                      "inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.06]",
                      consoleFocus,
                    )}
                    style={{ color: ERROR_SOFT }}
                    aria-label={`Delete expense ${expense.description?.trim() || "transaction"}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <ConsolePaginationBar
          page={p.expensesPage}
          pageSize={p.expensesLimit}
          total={p.expensesTotal}
          onPageChange={p.fetchExpenses}
        />
      </div>
    </section>
  )
}
