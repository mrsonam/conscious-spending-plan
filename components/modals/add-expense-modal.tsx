"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { DateInput } from "@/components/ui/date-input"
import { AppSelect } from "@/components/ui/app-select"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { parseMoneyInput } from "@/lib/money-input"
import {
  buildFieldErrors,
  hasFieldErrors,
  requireField,
  requirePositiveNumber,
  requireSelection,
} from "@/lib/form-validation"
import { useFormFieldErrors } from "@/hooks/use-form-field-errors"
import { FormErrorAlert } from "@/components/wealth-console/form-status-alert"
import {
  FormFieldError,
  formFieldAria,
} from "@/components/forms/form-field-error"
import { invalidateExpenseDataCaches, fetchJsonAndCache, peekCachedJson } from "@/lib/client-fetch-cache"
import { ACCOUNTS_LIST_CACHE_KEY } from "@/hooks/use-accounts-page"
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
import { createOptimisticExpenseId } from "@/lib/expense-optimistic"
import { toastError, toastSuccess } from "@/lib/app-toast"
import type {
  DashboardConsoleSnapshot,
  DashboardExpenseLogPatch,
} from "@/lib/dashboard-console-optimistic"

type ExpenseModalFieldKey = "accountId" | "amount" | "date" | "fundCategory"

interface Account {
  id: string
  name: string
  bankName: string
  balance: number
  accountType: string
  isDefault: boolean
}

interface AddExpenseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void | Promise<void>
  onOptimisticApply?: (
    input: DashboardExpenseLogPatch,
  ) => DashboardConsoleSnapshot
  onOptimisticRollback?: (snapshot: DashboardConsoleSnapshot) => void
}

const fieldStyle = {
  background: TOKENS.surfaceLow,
  borderColor: TOKENS.outlineGhost,
  color: TOKENS.onSurface,
} as const

const selectFieldStyle = {
  backgroundColor: TOKENS.surfaceLow,
  borderColor: TOKENS.outlineGhost,
  color: TOKENS.onSurface,
} as const

function defaultAccountId(list: Account[]): string {
  if (list.length === 0) return ""
  return list.find((a) => a.isDefault)?.id ?? list[0]!.id
}

export function AddExpenseModal({
  open,
  onOpenChange,
  onSuccess,
  onOptimisticApply,
  onOptimisticRollback,
}: AddExpenseModalProps) {
  const { formatCurrency, currencyCode } = useFormatCurrency()
  const [accountId, setAccountId] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [fundCategory, setFundCategory] = useState("")
  const [expenseCategory, setExpenseCategory] = useState("")
  const [date, setDate] = useState("")
  const [accounts, setAccounts] = useState<Account[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const { fieldErrors, setFieldErrors, clearFieldError, clearFieldErrors } =
    useFormFieldErrors<ExpenseModalFieldKey>()

  useEffect(() => {
    if (!open) return

    const today = new Date()
    setDate(today.toISOString().split("T")[0])

    const applyAccounts = (list: Account[]) => {
      setAccounts(list)
      if (list.length > 0) {
        setAccountId(defaultAccountId(list))
      }
    }

    const cached = peekCachedJson<{ accounts?: Account[] }>(
      ACCOUNTS_LIST_CACHE_KEY,
      60_000,
    )
    if (cached?.accounts?.length) {
      applyAccounts(cached.accounts)
    }

    void fetchJsonAndCache<{ accounts?: Account[] }>(
      ACCOUNTS_LIST_CACHE_KEY,
      "/api/accounts",
    )
      .then((data) => {
        applyAccounts(data.accounts ?? [])
      })
      .catch(() => {
        /* keep cached selection if refresh fails */
      })
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const selectedAccount = accounts.find((acc) => acc.id === accountId)
    const isCashAccount = selectedAccount?.accountType === "cash"

    const errs = buildFieldErrors<ExpenseModalFieldKey>([
      ["accountId", requireSelection(accountId, "an account")],
      ["amount", requirePositiveNumber(amount, "Amount")],
      ["date", requireField(date, "Date")],
      [
        "fundCategory",
        !isCashAccount ? requireSelection(fundCategory, "a fund category") : null,
      ],
    ])
    if (hasFieldErrors(errs)) {
      setFieldErrors(errs)
      return
    }
    clearFieldErrors()

    const amountNum = parseMoneyInput(amount, currencyCode)

    const payload = {
      accountId,
      amount: amountNum,
      description: description || null,
      category: fundCategory || null,
      expenseCategory: expenseCategory || null,
      date,
    }

    const optimisticId = createOptimisticExpenseId()
    const snapshot = onOptimisticApply?.({
      id: optimisticId,
      accountId,
      amount: amountNum,
      description: description || null,
      category: fundCategory || null,
      date,
    })

    toastSuccess("Expense logged successfully!")
    setFormError(null)
    setAmount("")
    setDescription("")
    setFundCategory("")
    setExpenseCategory("")
    onOpenChange(false)
    invalidateExpenseDataCaches()

    void (async () => {
      setSubmitting(true)
      try {
        const response = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || "Failed to log expense")
        }
        await onSuccess?.()
      } catch (error) {
        if (snapshot && onOptimisticRollback) {
          onOptimisticRollback(snapshot)
        }
        const message =
          error instanceof Error ? error.message : "Failed to log expense"
        setFormError(message)
        toastError(message)
        onOpenChange(true)
      } finally {
        setSubmitting(false)
      }
    })()
  }

  const selectedAccount = accounts.find((acc) => acc.id === accountId)
  const isCashAccount = selectedAccount?.accountType === "cash"

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
              Log expense
            </DialogTitle>
            <DialogDescription
              className="text-sm leading-relaxed"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Deduct from an account. Non-cash accounts require a fund pillar.
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            onSubmit={handleSubmit}
            className="mt-6 space-y-5"
            inert={submitting}
          >
            <FormErrorAlert error={formError} />

            <fieldset
              disabled={submitting}
              className="min-w-0 space-y-5 border-0 p-0"
            >
              <div>
                <label
                  htmlFor="account"
                  className={expenseFieldLabelClass}
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Account *
                </label>
                <AppSelect
                  id="account"
                  key={open ? "open" : "closed"}
                  value={accountId}
                  onValueChange={(v) => {
                    setAccountId(v)
                    clearFieldError("accountId")
                    const account = accounts.find((acc) => acc.id === v)
                    if (account?.accountType === "cash") {
                      setFundCategory("")
                    }
                  }}
                  disabled={submitting}
                  className={cn(expenseConsoleField, "mt-1 border-transparent")}
                  style={selectFieldStyle}
                  aria-invalid={!!fieldErrors.accountId}
                  {...formFieldAria("account", fieldErrors.accountId)}
                  options={accounts.map((account) => ({
                    value: account.id,
                    label: `${account.name} (${account.bankName}), ${formatCurrency(account.balance)}`,
                  }))}
                />
                <FormFieldError
                  controlId="account"
                  message={fieldErrors.accountId}
                />
              </div>

              <div>
                <label
                  htmlFor="amount"
                  className={expenseFieldLabelClass}
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Amount ($) *
                </label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value)
                    clearFieldError("amount")
                  }}
                  min="0"
                  step="0.01"
                  disabled={submitting}
                  placeholder="0.00"
                  className={cn(expenseConsoleField, "border-transparent")}
                  style={fieldStyle}
                  {...formFieldAria("amount", fieldErrors.amount)}
                />
                <FormFieldError controlId="amount" message={fieldErrors.amount} />
              </div>

              <div>
                <label
                  htmlFor="date"
                  className={expenseFieldLabelClass}
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Date *
                </label>
                <DateInput
                  id="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value)
                    clearFieldError("date")
                  }}
                  disabled={submitting}
                  className={cn(expenseConsoleField, "border-transparent")}
                  style={fieldStyle}
                  aria-invalid={!!fieldErrors.date}
                  {...formFieldAria("date", fieldErrors.date)}
                />
                <FormFieldError controlId="date" message={fieldErrors.date} />
              </div>

              {!isCashAccount && (
                <div>
                  <label
                    htmlFor="fundCategory"
                    className={expenseFieldLabelClass}
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    Fund category *
                  </label>
                  <AppSelect
                    id="fundCategory"
                    value={fundCategory}
                    onValueChange={(v) => {
                      setFundCategory(v)
                      clearFieldError("fundCategory")
                    }}
                    disabled={submitting}
                    className={cn(expenseConsoleField, "mt-1 border-transparent")}
                    style={selectFieldStyle}
                    placeholder="Select fund"
                    aria-invalid={!!fieldErrors.fundCategory}
                    {...formFieldAria("fundCategory", fieldErrors.fundCategory)}
                    options={[
                      { value: "", label: "Select fund" },
                      ...FUND_CATEGORIES.map((cat) => ({
                        value: cat.value,
                        label: cat.label,
                      })),
                    ]}
                  />
                  <FormFieldError
                    controlId="fundCategory"
                    message={fieldErrors.fundCategory}
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="expenseCategory"
                  className={expenseFieldLabelClass}
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Expense category
                </label>
                <AppSelect
                  id="expenseCategory"
                  value={expenseCategory}
                  onValueChange={setExpenseCategory}
                  disabled={submitting}
                  className={cn(expenseConsoleField, "mt-1 border-transparent")}
                  style={selectFieldStyle}
                  placeholder="Optional"
                  options={[
                    { value: "", label: "Optional" },
                    ...EXPENSE_CATEGORIES.map((cat) => ({
                      value: cat.value,
                      label: cat.label,
                    })),
                  ]}
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className={expenseFieldLabelClass}
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Description
                </label>
                <Input
                  id="description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={submitting}
                  placeholder="Memo"
                  className={cn(expenseConsoleField, "border-transparent")}
                  style={fieldStyle}
                />
              </div>
            </fieldset>

            <button
              type="submit"
              disabled={submitting}
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
              {submitting ? "Logging…" : "Log expense"}
            </button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
