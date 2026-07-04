"use client"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AppSelect } from "@/components/ui/app-select"
import { cn } from "@/lib/utils"
import { consoleFocus } from "@/components/wealth-console/console-ui"
import {
  EXPENSE_CATEGORIES,
  FUND_CATEGORIES,
} from "@/lib/expense-page-constants"
import {
  expenseConsoleField,
  expenseFieldLabelClass,
  expenseMicroLabelClass,
  expenseMicroLabelStyle,
} from "@/components/expenses/expense-console-ui"
import { TOKENS } from "@/lib/wealth-console-tokens"
import type { UseExpensePageResult } from "@/hooks/use-expense-page"

type ExpenseBulkDialogProps = {
  p: UseExpensePageResult
}

export function ExpenseBulkDialog({ p }: ExpenseBulkDialogProps) {
  return (
    <Dialog
      open={p.showBulkForm}
      onOpenChange={(o) => {
        p.setShowBulkForm(o)
        if (!o) p.setMessage(null)
      }}
    >
      <DialogContent
        className="relative max-h-[90vh] overflow-y-auto border p-0 shadow-2xl"
        style={{
          background: TOKENS.surfaceContainer,
          borderColor: TOKENS.outlineGhost,
          boxShadow:
            "0 24px 48px rgba(0,0,0,0.5), inset 0 1px 0 0 rgba(218,226,253,0.06)",
        }}
      >
        <DialogClose onClose={() => p.setShowBulkForm(false)} />
        <div className="p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle
              className="text-xl"
              style={{ color: TOKENS.onSurface }}
            >
              Bulk import
            </DialogTitle>
            <DialogDescription
              className="text-sm leading-relaxed"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              One line per expense. Columns: date, amount, description, fund,
              expense category (tab or comma).
            </DialogDescription>
          </DialogHeader>
          <form noValidate
            onSubmit={p.handleBulkSubmit}
            className="mt-6 space-y-5"
            inert={p.submittingBulk}
          >
            <div>
              <label
                htmlFor="bulk-expense-account"
                className={expenseMicroLabelClass}
                style={expenseMicroLabelStyle()}
              >
                Account
              </label>
              <AppSelect
                id="bulk-expense-account"
                value={p.bulkAccountId}
                onValueChange={p.setBulkAccountId}
                disabled={p.submittingBulk}
               
                className={cn(expenseConsoleField, "mt-1 border-transparent")}
                style={{
                  backgroundColor: TOKENS.surfaceLow,
                  borderColor: TOKENS.outlineGhost,
                  color: TOKENS.onSurface,
                }}
                options={p.accounts.map((acc) => ({
                  value: acc.id,
                  label: `${acc.name} (${acc.bankName})`,
                }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="bulk-expense-fund"
                  className={expenseMicroLabelClass}
                  style={expenseMicroLabelStyle()}
                >
                  Default fund
                </label>
                <AppSelect
                  id="bulk-expense-fund"
                  value={p.bulkFundCategory}
                  onValueChange={p.setBulkFundCategory}
                  disabled={p.submittingBulk}
                 
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
                  htmlFor="bulk-expense-type"
                  className={expenseMicroLabelClass}
                  style={expenseMicroLabelStyle()}
                >
                  Default expense type
                </label>
                <AppSelect
                  id="bulk-expense-type"
                  value={p.bulkExpenseCategory}
                  onValueChange={p.setBulkExpenseCategory}
                  disabled={p.submittingBulk}
                 
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
            </div>
            <div>
              <label
                htmlFor="bulk-expense-rows"
                className={expenseFieldLabelClass}
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Paste rows
              </label>
              <textarea
                id="bulk-expense-rows"
                value={p.bulkText}
                onChange={(e) => p.setBulkText(e.target.value)}
                rows={8}
                disabled={p.submittingBulk}
                className={cn(
                  expenseConsoleField,
                  "font-mono text-xs leading-relaxed",
                )}
                style={{
                  background: TOKENS.surfaceLow,
                  borderColor: TOKENS.outlineGhost,
                  color: TOKENS.onSurface,
                }}
              />
            </div>
            <button
              type="submit"
              disabled={p.submittingBulk}
              className={cn(
                "w-full min-h-11 rounded-xl py-3.5 text-xs font-bold uppercase tracking-[0.2em] transition-opacity disabled:opacity-50",
                consoleFocus,
              )}
              style={{
                background: TOKENS.primary,
                color: TOKENS.surface,
                boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
              }}
            >
              {p.submittingBulk ? "Adding…" : "Import all"}
            </button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
