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
  requireDifferent,
  requireField,
  requirePositiveNumber,
  requireSelection,
} from "@/lib/form-validation"
import { useFormFieldErrors } from "@/hooks/use-form-field-errors"
import { FormErrorAlert } from "@/components/wealth-console/form-status-alert"
import { FormFieldError, formFieldAria } from "@/components/forms/form-field-error"
import { toastError, toastSuccess } from "@/lib/app-toast"
import { applyAccountTransferBalances, cloneAccountRows } from "@/lib/account-optimistic"
import { invalidateCachedJson, invalidateCategoryTrackingAndDashboardCaches } from "@/lib/client-fetch-cache"
import { ACCOUNTS_LIST_CACHE_KEY } from "@/hooks/use-accounts-page"
import { cn } from "@/lib/utils"
import { consoleFocus } from "@/components/wealth-console/console-ui"
import { expenseConsoleField, expenseFieldLabelClass } from "@/components/expenses/expense-console-ui"
import { TOKENS } from "@/lib/wealth-console-tokens"

interface Account {
  id: string
  name: string
  bankName: string
  balance: number
  accountType: string
  isDefault: boolean
}

interface TransferModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const FUND_CATEGORIES = [
  { value: "fixedCosts", label: "Fixed Costs" },
  { value: "investment", label: "Investment" },
  { value: "savings", label: "Savings" },
  { value: "guiltFreeSpending", label: "Guilt-Free Spending" },
]

type TransferFieldKey =
  | "fromAccountId"
  | "toAccountId"
  | "transferAmount"
  | "transferDate"

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

export function TransferModal({ open, onOpenChange, onSuccess }: TransferModalProps) {
  const { formatCurrency, currencyCode } = useFormatCurrency()
  const [fromAccountId, setFromAccountId] = useState("")
  const [toAccountId, setToAccountId] = useState("")
  const [transferAmount, setTransferAmount] = useState("")
  const [transferDescription, setTransferDescription] = useState("")
  const [transferDate, setTransferDate] = useState("")
  const [transferCategory, setTransferCategory] = useState("")
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transferring, setTransferring] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const { fieldErrors, setFieldErrors, clearFieldError, clearFieldErrors } =
    useFormFieldErrors<TransferFieldKey>()

  // Default the date each time the modal opens (adjust-during-render, no effect).
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setTransferDate(new Date().toISOString().split("T")[0])
  }

  useEffect(() => {
    if (open) {
      fetch("/api/accounts")
        .then((res) => {
          if (res.ok) res.json().then((data) => setAccounts(data.accounts || []))
        })
        .catch((error) => console.error("Failed to load accounts:", error))
    }
  }, [open])

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const fromErr = requireSelection(fromAccountId, "a from account")
    const toErr = requireSelection(toAccountId, "a to account")
    const errs = buildFieldErrors<TransferFieldKey>([
      ["fromAccountId", fromErr],
      [
        "toAccountId",
        toErr ||
          (!fromErr && !toErr
            ? requireDifferent(fromAccountId, toAccountId, "From account", "To account")
            : null),
      ],
      ["transferAmount", requirePositiveNumber(transferAmount, "Amount")],
      ["transferDate", requireField(transferDate, "Transfer date")],
    ])
    if (hasFieldErrors(errs)) { setFieldErrors(errs); return }
    clearFieldErrors()

    const amountNum = parseMoneyInput(transferAmount, currencyCode)
    const payload = {
      fromAccountId,
      toAccountId,
      amount: amountNum,
      description: transferDescription || null,
      category: transferCategory || null,
      date: transferDate,
    }
    const snapshot = cloneAccountRows(accounts)

    setAccounts(applyAccountTransferBalances(accounts, payload.fromAccountId, payload.toAccountId, payload.amount))
    setTransferAmount("")
    setTransferDescription("")
    setTransferCategory("")
    setFromAccountId("")
    setToAccountId("")
    onOpenChange(false)
    toastSuccess("Transfer completed!")
    if (onSuccess) onSuccess()

    void (async () => {
      try {
        const response = await fetch("/api/transfers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const data = await response.json()
        if (!response.ok) {
          setAccounts(snapshot)
          setFormError(data.error || "Failed to create transfer")
          toastError(data.error || "Failed to create transfer")
          onOpenChange(true)
          return
        }
        invalidateCachedJson(ACCOUNTS_LIST_CACHE_KEY)
        invalidateCategoryTrackingAndDashboardCaches()
        const res = await fetch(`/api/accounts?t=${Date.now()}`)
        if (res.ok) {
          const refreshed = (await res.json()) as { accounts?: Account[] }
          setAccounts(refreshed.accounts || [])
        }
      } catch {
        setAccounts(snapshot)
        setFormError("An error occurred")
        toastError("An error occurred")
        onOpenChange(true)
      }
    })()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="relative max-h-[90vh] overflow-y-auto border p-0 shadow-2xl"
        style={{
          background: TOKENS.surfaceContainer,
          borderColor: TOKENS.outlineGhost,
          boxShadow: "0 24px 48px rgba(0,0,0,0.5), inset 0 1px 0 0 rgba(218,226,253,0.06)",
        }}
      >
        <DialogClose onClose={() => onOpenChange(false)} />
        <div className="p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl" style={{ color: TOKENS.onSurface }}>
              Transfer funds
            </DialogTitle>
            <DialogDescription className="text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
              Move money between your accounts.
            </DialogDescription>
          </DialogHeader>

          <form noValidate onSubmit={handleTransfer} className="mt-6 space-y-5" inert={transferring}>
            <FormErrorAlert error={formError} />
            <fieldset disabled={transferring} className="min-w-0 space-y-5 border-0 p-0">

              <div>
                <label htmlFor="fromAccount" className={expenseFieldLabelClass} style={{ color: TOKENS.onSurfaceMuted }}>
                  From account *
                </label>
                <AppSelect
                  id="fromAccount"
                  value={fromAccountId}
                  onValueChange={(v) => { setFromAccountId(v); clearFieldError("fromAccountId") }}
                  disabled={transferring}
                  className={cn(expenseConsoleField, "mt-1 border-transparent")}
                  style={selectFieldStyle}
                  placeholder="Select account"
                  aria-invalid={!!fieldErrors.fromAccountId}
                  {...formFieldAria("fromAccount", fieldErrors.fromAccountId)}
                  options={[
                    { value: "", label: "Select account" },
                    ...accounts.map((acc) => ({
                      value: acc.id,
                      label: `${acc.name} (${formatCurrency(acc.balance)})`,
                    })),
                  ]}
                />
                <FormFieldError controlId="fromAccount" message={fieldErrors.fromAccountId} />
              </div>

              <div>
                <label htmlFor="toAccount" className={expenseFieldLabelClass} style={{ color: TOKENS.onSurfaceMuted }}>
                  To account *
                </label>
                <AppSelect
                  id="toAccount"
                  value={toAccountId}
                  onValueChange={(v) => { setToAccountId(v); clearFieldError("toAccountId") }}
                  disabled={transferring}
                  className={cn(expenseConsoleField, "mt-1 border-transparent")}
                  style={selectFieldStyle}
                  placeholder="Select account"
                  aria-invalid={!!fieldErrors.toAccountId}
                  {...formFieldAria("toAccount", fieldErrors.toAccountId)}
                  options={[
                    { value: "", label: "Select account" },
                    ...accounts
                      .filter((acc) => acc.id !== fromAccountId)
                      .map((acc) => ({
                        value: acc.id,
                        label: `${acc.name} (${formatCurrency(acc.balance)})`,
                      })),
                  ]}
                />
                <FormFieldError controlId="toAccount" message={fieldErrors.toAccountId} />
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="transferAmount" className={expenseFieldLabelClass} style={{ color: TOKENS.onSurfaceMuted }}>
                    Amount *
                  </label>
                  <Input
                    id="transferAmount"
                    type="number"
                    value={transferAmount}
                    onChange={(e) => { setTransferAmount(e.target.value); clearFieldError("transferAmount") }}
                    min="0.01" step="0.01" placeholder="0.00"
                    className={cn(expenseConsoleField, "border-transparent")}
                    style={fieldStyle}
                    aria-invalid={!!fieldErrors.transferAmount}
                    {...formFieldAria("transferAmount", fieldErrors.transferAmount)}
                  />
                  <FormFieldError controlId="transferAmount" message={fieldErrors.transferAmount} />
                </div>
                <div>
                  <label htmlFor="transferDate" className={expenseFieldLabelClass} style={{ color: TOKENS.onSurfaceMuted }}>
                    Date *
                  </label>
                  <DateInput
                    id="transferDate"
                    value={transferDate}
                    onChange={(e) => { setTransferDate(e.target.value); clearFieldError("transferDate") }}
                    disabled={transferring}
                    className={cn(expenseConsoleField, "border-transparent")}
                    style={fieldStyle}
                    aria-invalid={!!fieldErrors.transferDate}
                    {...formFieldAria("transferDate", fieldErrors.transferDate)}
                  />
                  <FormFieldError controlId="transferDate" message={fieldErrors.transferDate} />
                </div>
              </div>

              <div>
                <label htmlFor="transferCategory" className={expenseFieldLabelClass} style={{ color: TOKENS.onSurfaceMuted }}>
                  Fund category
                </label>
                <AppSelect
                  id="transferCategory"
                  value={transferCategory}
                  onValueChange={setTransferCategory}
                  disabled={transferring}
                  className={cn(expenseConsoleField, "mt-1 border-transparent")}
                  style={selectFieldStyle}
                  placeholder="Optional"
                  options={[
                    { value: "", label: "None" },
                    ...FUND_CATEGORIES.map((cat) => ({ value: cat.value, label: cat.label })),
                  ]}
                />
              </div>

              <div>
                <label htmlFor="transferDescription" className={expenseFieldLabelClass} style={{ color: TOKENS.onSurfaceMuted }}>
                  Description
                </label>
                <Input
                  id="transferDescription"
                  type="text"
                  value={transferDescription}
                  onChange={(e) => setTransferDescription(e.target.value)}
                  disabled={transferring}
                  placeholder="Memo"
                  className={cn(expenseConsoleField, "border-transparent")}
                  style={fieldStyle}
                />
              </div>
            </fieldset>

            <button
              type="submit"
              disabled={transferring}
              className={cn(
                "w-full min-h-11 rounded-xl py-3.5 text-xs font-bold uppercase tracking-[0.2em] transition-opacity disabled:opacity-50",
                consoleFocus,
              )}
              style={{
                background: TOKENS.secondary,
                color: TOKENS.surface,
                boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
              }}
            >
              {transferring ? "Transferring…" : "Transfer funds"}
            </button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
