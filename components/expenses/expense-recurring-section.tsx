"use client"

import { ChevronDown, Play, Repeat, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { DateInput } from "@/components/ui/date-input"
import { AppSelect } from "@/components/ui/app-select"
import { cn } from "@/lib/utils"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { consoleFocus } from "@/components/wealth-console/console-ui"
import {
  EXPENSE_CATEGORIES,
  FUND_CATEGORIES,
  FREQUENCIES,
} from "@/lib/expense-page-constants"
import {
  expenseConsoleButtonClass,
  expenseConsoleField,
  expenseFieldLabelClass,
} from "@/components/expenses/expense-console-ui"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "@/lib/income-page-types"
import type { UseExpensePageResult } from "@/hooks/use-expense-page"

type ExpenseRecurringSectionProps = {
  p: UseExpensePageResult
  recurringOpen: boolean
  onRecurringOpenChange: (open: boolean) => void
}

export function ExpenseRecurringSection({
  p,
  recurringOpen,
  onRecurringOpenChange,
}: ExpenseRecurringSectionProps) {
  return (
    <section
      className="rounded-xl border"
      style={{
        background: TOKENS.surfaceLow,
        borderColor: TOKENS.outlineGhost,
        boxShadow: CARD_INSET,
      }}
      aria-labelledby="expense-recurring-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border"
            style={{
              borderColor: TOKENS.outlineGhost,
              color: TOKENS.onSurfaceMuted,
              background: TOKENS.surfaceContainer,
            }}
          >
            <Repeat className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2
              id="expense-recurring-heading"
              className="text-[10px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Recurring tools
            </h2>
            <p
              className="mt-1 text-sm"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              {p.loadingRecurring
                ? "Loading templates..."
                : p.recurring.length === 0
                  ? "No recurring templates configured"
                  : `${p.recurring.length} template${p.recurring.length === 1 ? "" : "s"} available`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onRecurringOpenChange(!recurringOpen)
              p.setMessage(null)
            }}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.18em]",
              expenseConsoleButtonClass,
            )}
            style={{
              borderColor: TOKENS.outlineGhost,
              color: TOKENS.onSurfaceMuted,
              background: TOKENS.surfaceContainer,
            }}
            aria-expanded={recurringOpen}
          >
            Manage
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                recurringOpen && "rotate-180",
              )}
            />
          </button>
          <button
            type="button"
            onClick={() => {
              onRecurringOpenChange(true)
              p.setShowRecurringForm(!p.showRecurringForm)
              p.setMessage(null)
              if (p.accounts.length && !p.recurringAccountId) {
                p.setRecurringAccountId(
                  p.accounts.find((a) => a.isDefault)?.id || p.accounts[0].id,
                )
              }
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
            {p.showRecurringForm ? "Close form" : "Add template"}
          </button>
        </div>
      </div>
      {(recurringOpen || p.showRecurringForm) && (
        <div
          className="border-t px-5 py-4 sm:px-6"
          style={{ borderColor: TOKENS.outlineGhost }}
        >
          {p.showRecurringForm && (
            <form noValidate
              onSubmit={p.handleAddRecurring}
              className="mt-4 flex flex-col gap-4 rounded-xl border p-4"
              style={{
                borderColor: TOKENS.outlineGhost,
                background: TOKENS.surfaceContainer,
              }}
              inert={p.submittingRecurring}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="recurring-account"
                    className={expenseFieldLabelClass}
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    Account *
                  </label>
                  <AppSelect
                    id="recurring-account"
                    value={p.recurringAccountId}
                    onValueChange={p.setRecurringAccountId}
                    disabled={p.submittingRecurring}
                   
                    className={cn(expenseConsoleField, "mt-1 border-transparent")}
                    style={{
                      backgroundColor: TOKENS.surfaceLow,
                      borderColor: TOKENS.outlineGhost,
                      color: TOKENS.onSurface,
                    }}
                    options={p.accounts.map((acc) => ({
                      value: acc.id,
                      label: acc.name,
                    }))}
                  />
                </div>
                <div>
                  <label
                    htmlFor="recurring-amount"
                    className={expenseFieldLabelClass}
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    Amount *
                  </label>
                  <Input
                    id="recurring-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={p.recurringAmount}
                    onChange={(e) => p.setRecurringAmount(e.target.value)}
                    disabled={p.submittingRecurring}
                    className={cn(expenseConsoleField, "border-transparent")}
                    style={{
                      background: TOKENS.surfaceLow,
                      borderColor: TOKENS.outlineGhost,
                      color: TOKENS.onSurface,
                    }}
                  />
                </div>
                <div>
                  <label
                    htmlFor="recurring-frequency"
                    className={expenseFieldLabelClass}
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    Frequency
                  </label>
                  <AppSelect
                    id="recurring-frequency"
                    value={p.recurringFrequency}
                    onValueChange={p.setRecurringFrequency}
                    disabled={p.submittingRecurring}
                   
                    className={cn(expenseConsoleField, "mt-1 border-transparent")}
                    style={{
                      backgroundColor: TOKENS.surfaceLow,
                      borderColor: TOKENS.outlineGhost,
                      color: TOKENS.onSurface,
                    }}
                    options={FREQUENCIES.map((f) => ({
                      value: f.value,
                      label: f.label,
                    }))}
                  />
                </div>
                <div>
                  <label
                    htmlFor="recurring-start"
                    className={expenseFieldLabelClass}
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    Start date
                  </label>
                  <DateInput
                    id="recurring-start"
                    value={p.recurringStartDate}
                    onChange={(e) => p.setRecurringStartDate(e.target.value)}
                    disabled={p.submittingRecurring}
                    className={cn(expenseConsoleField, "border-transparent")}
                    style={{
                      background: TOKENS.surfaceLow,
                      borderColor: TOKENS.outlineGhost,
                      color: TOKENS.onSurface,
                    }}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="recurring-description"
                    className={expenseFieldLabelClass}
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    Description
                  </label>
                  <Input
                    id="recurring-description"
                    value={p.recurringDescription}
                    onChange={(e) => p.setRecurringDescription(e.target.value)}
                    disabled={p.submittingRecurring}
                    className={cn(expenseConsoleField, "border-transparent")}
                    style={{
                      background: TOKENS.surfaceLow,
                      borderColor: TOKENS.outlineGhost,
                      color: TOKENS.onSurface,
                    }}
                  />
                </div>
                <div>
                  <label
                    htmlFor="recurring-fund"
                    className={expenseFieldLabelClass}
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    Fund
                  </label>
                  <AppSelect
                    id="recurring-fund"
                    value={p.recurringFundCategory}
                    onValueChange={p.setRecurringFundCategory}
                    disabled={p.submittingRecurring}
                   
                    className={cn(expenseConsoleField, "mt-1 border-transparent")}
                    style={{
                      backgroundColor: TOKENS.surfaceLow,
                      borderColor: TOKENS.outlineGhost,
                      color: TOKENS.onSurface,
                    }}
                    placeholder="-"
                    options={[
                      { value: "", label: "-" },
                      ...FUND_CATEGORIES.map((c) => ({
                        value: c.value,
                        label: c.label,
                      })),
                    ]}
                  />
                </div>
                <div>
                  <label
                    htmlFor="recurring-expense-category"
                    className={expenseFieldLabelClass}
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    Expense category
                  </label>
                  <AppSelect
                    id="recurring-expense-category"
                    value={p.recurringExpenseCategory}
                    onValueChange={p.setRecurringExpenseCategory}
                    disabled={p.submittingRecurring}
                   
                    className={cn(expenseConsoleField, "mt-1 border-transparent")}
                    style={{
                      backgroundColor: TOKENS.surfaceLow,
                      borderColor: TOKENS.outlineGhost,
                      color: TOKENS.onSurface,
                    }}
                    placeholder="-"
                    options={[
                      { value: "", label: "-" },
                      ...EXPENSE_CATEGORIES.map((c) => ({
                        value: c.value,
                        label: c.label,
                      })),
                    ]}
                  />
                </div>
                <div>
                  <label
                    htmlFor="recurring-end"
                    className={expenseFieldLabelClass}
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    End date
                  </label>
                  <DateInput
                    id="recurring-end"
                    value={p.recurringEndDate}
                    onChange={(e) => p.setRecurringEndDate(e.target.value)}
                    disabled={p.submittingRecurring}
                    className={cn(expenseConsoleField, "border-transparent")}
                    style={{
                      background: TOKENS.surfaceLow,
                      borderColor: TOKENS.outlineGhost,
                      color: TOKENS.onSurface,
                    }}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={p.submittingRecurring}
                className={cn(
                  "rounded-xl py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] disabled:opacity-50",
                  consoleFocus,
                )}
                style={{
                  background: TOKENS.primary,
                  color: TOKENS.surface,
                }}
              >
                {p.submittingRecurring ? "Saving…" : "Save template"}
              </button>
            </form>
          )}
          {p.loadingRecurring ? (
            <p className="mt-4 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
              Loading…
            </p>
          ) : p.recurring.length === 0 ? (
            <p className="mt-4 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
              No recurring templates yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {p.recurring.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-3"
                  style={{
                    background: TOKENS.surfaceContainer,
                    borderColor: TOKENS.outlineGhost,
                    boxShadow: CARD_INSET,
                  }}
                >
                  <div className="min-w-0">
                    <MajorFigureCurrency
                      amount={r.amount}
                      variant="loss"
                      className="text-base font-bold!"
                    />
                    <span
                      className="ml-2 text-xs capitalize"
                      style={{ color: TOKENS.onSurfaceMuted }}
                    >
                      {r.frequency}
                    </span>
                    {r.description && (
                      <p
                        className="mt-1 truncate text-sm"
                        style={{ color: TOKENS.onSurface }}
                      >
                        {r.description}
                      </p>
                    )}
                    <p
                      className="text-xs"
                      style={{ color: TOKENS.onSurfaceMuted }}
                    >
                      {r.account.name}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => p.handleLogRecurring(r.id)}
                      disabled={p.loggingRecurringId !== null}
                      className={cn(
                        "inline-flex min-h-11 items-center rounded-lg border px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide disabled:opacity-50",
                        expenseConsoleButtonClass,
                      )}
                      style={{
                        borderColor: TOKENS.outlineGhost,
                        color: TOKENS.primary,
                      }}
                    >
                      <Play className="mr-1 inline h-3 w-3" aria-hidden />
                      {p.loggingRecurringId === r.id ? "…" : "Log now"}
                    </button>
                    <button
                      type="button"
                      onClick={() => p.handleDeleteRecurring(r.id)}
                      className={cn(
                        "inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-lg transition-colors",
                        consoleFocus,
                      )}
                      style={{ color: ERROR_SOFT }}
                      aria-label={`Delete recurring template ${r.description || r.account.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
