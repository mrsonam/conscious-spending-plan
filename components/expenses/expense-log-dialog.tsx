"use client"

import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DateInput } from "@/components/ui/date-input"
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
} from "@/components/expenses/expense-console-ui"
import { TOKENS } from "@/lib/wealth-console-tokens"
import type { UseExpensePageResult } from "@/hooks/use-expense-page"
import { FormErrorAlert } from "@/components/wealth-console/form-status-alert"
import {
  FormFieldError,
  formFieldAria,
} from "@/components/forms/form-field-error"

type ExpenseLogDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  p: UseExpensePageResult
  onSubmit: (e: React.FormEvent) => void | Promise<void>
  editingExpenseId?: string | null
}

export function ExpenseLogDialog({
  open,
  onOpenChange,
  p,
  onSubmit,
  editingExpenseId = null,
}: ExpenseLogDialogProps) {
  const fe = p.fieldErrors
  const isEditing = Boolean(editingExpenseId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="relative max-h-[90vh] overflow-y-auto border p-0 shadow-2xl"
        style={{
          background: TOKENS.surfaceContainer,
          borderColor: TOKENS.outlineGhost,
          boxShadow:
            "0 24px 48px rgba(0,0,0,0.5), inset 0 1px 0 0 rgba(218,226,253,0.06)",
        }}
      >
        <DialogClose onClose={() => onOpenChange(false)} />
        <div className="p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle
              className="text-xl"
              style={{ color: TOKENS.onSurface }}
            >
              {isEditing ? "Edit expense" : "Log expense"}
            </DialogTitle>
            <DialogDescription
              className="text-sm leading-relaxed"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              {isEditing
                ? "Update amount, account, categories, or date. Account balances adjust automatically."
                : "Deduct from an account. Non-cash accounts require a fund pillar."}
            </DialogDescription>
          </DialogHeader>
          <form noValidate onSubmit={onSubmit} className="mt-6 space-y-5" inert={p.submitting}>
            <FormErrorAlert error={p.logFormError} />
            <div>
              <label
                htmlFor="exp-account"
                className={expenseFieldLabelClass}
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Account *
              </label>
              <AppSelect
                id="exp-account"
                value={p.accountId}
                onValueChange={(v) => {
                  p.setAccountId(v)
                  p.clearFieldError("accountId")
                  const a = p.accounts.find((acc) => acc.id === v)
                  if (a?.accountType === "cash") {
                    p.setFundCategory("")
                    p.setSavingGoalId("")
                  }
                }}
                disabled={p.submitting}
               
                className={cn(expenseConsoleField, "mt-1 border-transparent")}
                style={{
                  backgroundColor: TOKENS.surfaceLow,
                  borderColor: TOKENS.outlineGhost,
                  color: TOKENS.onSurface,
                }}
                aria-invalid={!!fe.accountId}
                {...formFieldAria("exp-account", fe.accountId)}
                options={p.accounts.map((account) => ({
                  value: account.id,
                  label: `${account.name} (${account.bankName}), ${p.formatCurrency(account.balance)}`,
                }))}
              />
              <FormFieldError controlId="exp-account" message={fe.accountId} />
            </div>
            <div>
              <label
                htmlFor="exp-amt"
                className={expenseFieldLabelClass}
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Amount ($) *
              </label>
              <Input
                id="exp-amt"
                type="number"
                min="0"
                step="0.01"
                value={p.amount}
                onChange={(e) => {
                  p.setAmount(e.target.value)
                  p.clearFieldError("amount")
                }}
                disabled={p.submitting}
                className={cn(expenseConsoleField, "border-transparent")}
                style={{
                  background: TOKENS.surfaceLow,
                  borderColor: TOKENS.outlineGhost,
                  color: TOKENS.onSurface,
                }}
                {...formFieldAria("exp-amt", fe.amount)}
              />
              <FormFieldError controlId="exp-amt" message={fe.amount} />
            </div>
            <div>
              <label
                htmlFor="exp-date"
                className={expenseFieldLabelClass}
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Date *
              </label>
              <DateInput
                id="exp-date"
                value={p.date}
                onChange={(e) => {
                  p.setDate(e.target.value)
                  p.clearFieldError("date")
                }}
                disabled={p.submitting}
                className={cn(expenseConsoleField, "border-transparent")}
                style={{
                  background: TOKENS.surfaceLow,
                  borderColor: TOKENS.outlineGhost,
                  color: TOKENS.onSurface,
                }}
                aria-invalid={!!fe.date}
                {...formFieldAria("exp-date", fe.date)}
              />
              <FormFieldError controlId="exp-date" message={fe.date} />
            </div>
            {(() => {
              const sel = p.accounts.find((a) => a.id === p.accountId)
              const cash = sel?.accountType === "cash"
              if (cash) return null
              return (
                <div>
                  <label
                    htmlFor="exp-fund"
                    className={expenseFieldLabelClass}
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    Fund category *
                  </label>
                  <AppSelect
                    id="exp-fund"
                    value={p.fundCategory}
                    onValueChange={(v) => {
                      p.setFundCategory(v)
                      p.clearFieldError("fundCategory")
                      if (v !== "savings") {
                        p.setSavingGoalId("")
                        p.clearFieldError("savingGoalId")
                      }
                    }}
                    disabled={p.submitting}
                   
                    className={cn(expenseConsoleField, "mt-1 border-transparent")}
                    style={{
                      backgroundColor: TOKENS.surfaceLow,
                      borderColor: TOKENS.outlineGhost,
                      color: TOKENS.onSurface,
                    }}
                    placeholder="Select fund"
                    aria-invalid={!!fe.fundCategory}
                    {...formFieldAria("exp-fund", fe.fundCategory)}
                    options={[
                      { value: "", label: "Select fund" },
                      ...FUND_CATEGORIES.map((c) => ({
                        value: c.value,
                        label: c.label,
                      })),
                    ]}
                  />
                  <FormFieldError controlId="exp-fund" message={fe.fundCategory} />
                </div>
              )
            })()}
            {p.fundCategory === "savings" && (
              <div>
                <label
                  htmlFor="exp-saving-goal"
                  className={expenseFieldLabelClass}
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Saving goal
                </label>
                <AppSelect
                  id="exp-saving-goal"
                  value={p.savingGoalId}
                  onValueChange={(v) => {
                    p.setSavingGoalId(v)
                    p.clearFieldError("savingGoalId")
                  }}
                  disabled={p.submitting}
                  className={cn(expenseConsoleField, "mt-1 border-transparent")}
                  style={{
                    backgroundColor: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                  placeholder="General savings"
                  aria-invalid={!!fe.savingGoalId}
                  {...formFieldAria("exp-saving-goal", fe.savingGoalId)}
                  options={[
                    { value: "", label: "General savings (no specific goal)" },
                    ...p.savingGoals
                      .filter((g) => g.status === "active")
                      .map((g) => ({
                        value: g.id,
                        label: `${g.name} — ${p.formatCurrency(g.current)} available`,
                      })),
                  ]}
                />
                <FormFieldError controlId="exp-saving-goal" message={fe.savingGoalId} />
              </div>
            )}
            <div>
              <label
                htmlFor="exp-ec"
                className={expenseFieldLabelClass}
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Expense category
              </label>
              <AppSelect
                id="exp-ec"
                value={p.expenseCategory}
                onValueChange={p.setExpenseCategory}
                disabled={p.submitting}
               
                className={cn(expenseConsoleField, "mt-1 border-transparent")}
                style={{
                  backgroundColor: TOKENS.surfaceLow,
                  borderColor: TOKENS.outlineGhost,
                  color: TOKENS.onSurface,
                }}
                placeholder="Optional"
                options={[
                  { value: "", label: "Optional" },
                  ...EXPENSE_CATEGORIES.map((c) => ({
                    value: c.value,
                    label: c.label,
                  })),
                ]}
              />
            </div>
            <div>
              <label
                htmlFor="exp-desc"
                className={expenseFieldLabelClass}
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Description
              </label>
              <Input
                id="exp-desc"
                type="text"
                value={p.description}
                onChange={(e) => p.setDescription(e.target.value)}
                placeholder="Memo"
                disabled={p.submitting}
                className={cn(expenseConsoleField, "border-transparent")}
                style={{
                  background: TOKENS.surfaceLow,
                  borderColor: TOKENS.outlineGhost,
                  color: TOKENS.onSurface,
                }}
              />
            </div>
            <button
              type="submit"
              disabled={p.submitting}
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
              {p.submitting
                ? isEditing
                  ? "Saving…"
                  : "Logging…"
                : isEditing
                  ? "Save changes"
                  : "Log expense"}
            </button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
