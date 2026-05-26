"use client"

import { Calendar } from "lucide-react"
import { DateInput } from "@/components/ui/date-input"
import { AppSelect } from "@/components/ui/app-select"
import { cn } from "@/lib/utils"
import { TOKENS } from "@/lib/wealth-console-tokens"
import {
  EXPENSE_CATEGORIES,
  FUND_CATEGORIES,
} from "@/lib/expense-page-constants"
import {
  expenseConsoleButtonClass,
  expenseConsoleField,
  expenseMicroLabelClass,
  expenseMicroLabelStyle,
} from "@/components/expenses/expense-console-ui"
import type { UseExpensePageResult } from "@/hooks/use-expense-page"

type ExpenseHistoryFiltersProps = {
  p: UseExpensePageResult
}

export function ExpenseHistoryFilters({ p }: ExpenseHistoryFiltersProps) {
  const hasFilters =
    p.filterStartDate ||
    p.filterEndDate ||
    p.filterFundCategory ||
    p.filterExpenseCategory ||
    p.filterAccountId

  return (
    <div className="border-b pb-5" style={{ borderColor: TOKENS.outlineGhost }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar
            className="h-4 w-4 shrink-0"
            style={{ color: TOKENS.secondary }}
            strokeWidth={2}
          />
          <p className={expenseMicroLabelClass} style={expenseMicroLabelStyle()}>
            Filters
          </p>
        </div>
        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              p.setFilterStartDate("")
              p.setFilterEndDate("")
              p.setFilterFundCategory("")
              p.setFilterExpenseCategory("")
              p.setFilterAccountId("")
            }}
            className={cn(
              "min-h-11 rounded-lg border px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.18em]",
              expenseConsoleButtonClass,
            )}
            style={{
              borderColor: TOKENS.outlineGhost,
              color: TOKENS.onSurfaceMuted,
            }}
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="expense-filter-from"
            className={expenseMicroLabelClass}
            style={expenseMicroLabelStyle()}
          >
            From
          </label>
          <DateInput
            id="expense-filter-from"
            value={p.filterStartDate}
            onChange={(e) => p.setFilterStartDate(e.target.value)}
            className={cn(expenseConsoleField, "border-transparent")}
            style={{
              background: TOKENS.surfaceContainer,
              borderColor: TOKENS.outlineGhost,
              color: TOKENS.onSurface,
            }}
          />
        </div>
        <div>
          <label
            htmlFor="expense-filter-to"
            className={expenseMicroLabelClass}
            style={expenseMicroLabelStyle()}
          >
            To
          </label>
          <DateInput
            id="expense-filter-to"
            value={p.filterEndDate}
            onChange={(e) => p.setFilterEndDate(e.target.value)}
            className={cn(expenseConsoleField, "border-transparent")}
            style={{
              background: TOKENS.surfaceContainer,
              borderColor: TOKENS.outlineGhost,
              color: TOKENS.onSurface,
            }}
          />
        </div>
        <div>
          <label
            htmlFor="expense-filter-fund"
            className={expenseMicroLabelClass}
            style={expenseMicroLabelStyle()}
          >
            Fund pillar
          </label>
          <AppSelect
            id="expense-filter-fund"
            value={p.filterFundCategory}
            onValueChange={p.setFilterFundCategory}
           
            className={cn(expenseConsoleField, "mt-1 border-transparent")}
            style={{
              backgroundColor: TOKENS.surfaceContainer,
              borderColor: TOKENS.outlineGhost,
              color: TOKENS.onSurface,
            }}
            placeholder="All"
            options={[
              { value: "", label: "All" },
              ...FUND_CATEGORIES.map((c) => ({
                value: c.value,
                label: c.label,
              })),
            ]}
          />
        </div>
        <div>
          <label
            htmlFor="expense-filter-type"
            className={expenseMicroLabelClass}
            style={expenseMicroLabelStyle()}
          >
            Expense type
          </label>
          <AppSelect
            id="expense-filter-type"
            value={p.filterExpenseCategory}
            onValueChange={p.setFilterExpenseCategory}
           
            className={cn(expenseConsoleField, "mt-1 border-transparent")}
            style={{
              backgroundColor: TOKENS.surfaceContainer,
              borderColor: TOKENS.outlineGhost,
              color: TOKENS.onSurface,
            }}
            placeholder="All"
            options={[
              { value: "", label: "All" },
              ...EXPENSE_CATEGORIES.map((c) => ({
                value: c.value,
                label: c.label,
              })),
            ]}
          />
        </div>
        <div className="sm:col-span-2">
          <label
            htmlFor="expense-filter-account"
            className={expenseMicroLabelClass}
            style={expenseMicroLabelStyle()}
          >
            Account
          </label>
          <AppSelect
            id="expense-filter-account"
            value={p.filterAccountId}
            onValueChange={p.setFilterAccountId}
           
            className={cn(expenseConsoleField, "mt-1 border-transparent")}
            style={{
              backgroundColor: TOKENS.surfaceContainer,
              borderColor: TOKENS.outlineGhost,
              color: TOKENS.onSurface,
            }}
            placeholder="All accounts"
            options={[
              { value: "", label: "All accounts" },
              ...p.accounts.map((a) => ({
                value: a.id,
                label: `${a.name} (${a.bankName})`,
              })),
            ]}
          />
        </div>
      </div>
    </div>
  )
}
