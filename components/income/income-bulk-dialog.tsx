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
  expenseConsoleField,
  expenseFieldLabelClass,
  expenseMicroLabelClass,
  expenseMicroLabelStyle,
} from "@/components/expenses/expense-console-ui"
import { TOKENS } from "@/lib/wealth-console-tokens"
import type { UseIncomePageResult } from "@/hooks/use-income-page"

type IncomeBulkDialogProps = {
  p: UseIncomePageResult
}

export function IncomeBulkDialog({ p }: IncomeBulkDialogProps) {
  return (
    <Dialog
      open={p.showBulkForm}
      onOpenChange={(o) => {
        p.setShowBulkForm(o)
        if (!o) p.setError("")
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
              One line per income entry. Columns: date, amount, description,
              allocate to budget (optional: true/false; tab or comma).
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            onSubmit={p.handleBulkSubmit}
            className="mt-6 space-y-5"
            inert={p.submittingBulk}
          >
            <div>
              <label
                htmlFor="bulk-income-account"
                className={expenseMicroLabelClass}
                style={expenseMicroLabelStyle()}
              >
                Deposit to account
              </label>
              <AppSelect
                id="bulk-income-account"
                value={p.bulkAccountId}
                onValueChange={p.setBulkAccountId}
                disabled={p.submittingBulk || p.accounts.length === 0}
                className={cn(expenseConsoleField, "mt-1 border-transparent")}
                style={{
                  backgroundColor: TOKENS.surfaceLow,
                  borderColor: TOKENS.outlineGhost,
                  color: TOKENS.onSurface,
                }}
                options={p.accounts.map((account) => ({
                  value: account.id,
                  label: `${account.name} (${account.bankName})${account.isDefault ? ", Default" : ""}`,
                }))}
              />
            </div>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-snug">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border"
                  style={{
                    borderColor: TOKENS.outlineGhost,
                    background: TOKENS.surfaceLow,
                    accentColor: TOKENS.primary,
                  }}
                  checked={p.bulkAllocateToBudget}
                  disabled={p.submittingBulk}
                  onChange={(e) => p.setBulkAllocateToBudget(e.target.checked)}
                />
                <span style={{ color: TOKENS.onSurface }}>
                  Default: allocate to budget categories
                </span>
              </label>
            </div>
            <div>
              <label
                htmlFor="bulk-income-rows"
                className={expenseFieldLabelClass}
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Paste rows
              </label>
              <textarea
                id="bulk-income-rows"
                value={p.bulkText}
                onChange={(e) => p.setBulkText(e.target.value)}
                rows={8}
                disabled={p.submittingBulk}
                placeholder={
                  "2026-05-01\t3500.00\tPayroll\ttrue\n2026-05-15\t250.00\tFreelance"
                }
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
              disabled={p.submittingBulk || !p.allocation}
              className={cn(
                "w-full min-h-11 rounded-xl py-3.5 text-xs font-bold uppercase tracking-[0.2em] transition-opacity disabled:opacity-50 hover:opacity-95",
                consoleFocus,
              )}
              style={{
                background: TOKENS.primary,
                color: TOKENS.surface,
                boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
              }}
            >
              {p.submittingBulk ? "Importing…" : "Import all"}
            </button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
