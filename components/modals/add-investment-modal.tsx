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
import { buildFieldErrors, hasFieldErrors, requireField, requirePositiveNumber, requireSelection } from "@/lib/form-validation"
import { useFormFieldErrors } from "@/hooks/use-form-field-errors"
import { FormErrorAlert } from "@/components/wealth-console/form-status-alert"
import { FormFieldError, formFieldAria } from "@/components/forms/form-field-error"
import { cn } from "@/lib/utils"
import { consoleFocus } from "@/components/wealth-console/console-ui"
import { expenseConsoleField, expenseFieldLabelClass } from "@/components/expenses/expense-console-ui"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { toastError, toastSuccess } from "@/lib/app-toast"

type FieldKey = "investmentAccountId" | "investmentName" | "amount" | "date"

interface InvestmentAccount {
  id: string
  name: string
  bankName: string
  balance: number
}

interface AddInvestmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void | Promise<void>
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

export function AddInvestmentModal({
  open,
  onOpenChange,
  onSuccess,
}: AddInvestmentModalProps) {
  const { formatCurrency, currencyCode } = useFormatCurrency()
  const [accounts, setAccounts] = useState<InvestmentAccount[]>([])
  const [investmentAccountId, setInvestmentAccountId] = useState("")
  const [investmentName, setInvestmentName] = useState("")
  const [amount, setAmount] = useState("")
  const [units, setUnits] = useState("")
  const [pricePerUnit, setPricePerUnit] = useState("")
  const [date, setDate] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const { fieldErrors, setFieldErrors, clearFieldError, clearFieldErrors } =
    useFormFieldErrors<FieldKey>()

  useEffect(() => {
    if (!open) return
    setDate(new Date().toISOString().split("T")[0])
    fetch("/api/accounts").then(async (res) => {
      if (!res.ok) return
      const data = await res.json()
      const list: InvestmentAccount[] = (data.accounts ?? []).filter(
        (a: { accountType: string }) => a.accountType === "investment",
      )
      setAccounts(list)
      if (list.length > 0 && !investmentAccountId) setInvestmentAccountId(list[0].id)
    })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => {
    setInvestmentName("")
    setAmount("")
    setUnits("")
    setPricePerUnit("")
    clearFieldErrors()
    setFormError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const errs = buildFieldErrors<FieldKey>([
      ["investmentAccountId", requireSelection(investmentAccountId, "an investment account")],
      ["investmentName", requireField(investmentName.trim(), "Investment name")],
      ["amount", requirePositiveNumber(amount, "Amount")],
      ["date", requireField(date, "Date")],
    ])
    if (hasFieldErrors(errs)) { setFieldErrors(errs); return }
    clearFieldErrors()

    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        investmentAccountId,
        investmentName: investmentName.trim(),
        amount: parseMoneyInput(amount, currencyCode),
        date,
      }
      if (units) payload.numberOfShares = units
      if (pricePerUnit) payload.pricePerUnit = pricePerUnit

      const res = await fetch("/api/investments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to log investment")
      toastSuccess("Investment logged!")
      reset()
      onOpenChange(false)
      await onSuccess?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to log investment"
      setFormError(msg)
      toastError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent
        className="relative max-h-[90vh] overflow-y-auto border p-0 shadow-2xl"
        style={{
          background: TOKENS.surfaceContainer,
          borderColor: TOKENS.outlineGhost,
          boxShadow: "0 24px 48px rgba(0,0,0,0.5), inset 0 1px 0 0 rgba(218,226,253,0.06)",
        }}
      >
        <DialogClose onClose={() => { reset(); onOpenChange(false) }} />
        <div className="p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl" style={{ color: TOKENS.onSurface }}>
              Log investment
            </DialogTitle>
            <DialogDescription className="text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
              Record a purchase from your investment account.
            </DialogDescription>
          </DialogHeader>

          <form noValidate onSubmit={handleSubmit} className="mt-6 space-y-5" inert={submitting}>
            <FormErrorAlert error={formError} />
            <fieldset disabled={submitting} className="min-w-0 space-y-5 border-0 p-0">

              {accounts.length > 0 ? (
                <div>
                  <label htmlFor="inv-account" className={expenseFieldLabelClass} style={{ color: TOKENS.onSurfaceMuted }}>
                    Investment account *
                  </label>
                  <AppSelect
                    id="inv-account"
                    value={investmentAccountId}
                    onValueChange={(v) => { setInvestmentAccountId(v); clearFieldError("investmentAccountId") }}
                    disabled={submitting}
                    className={cn(expenseConsoleField, "mt-1 border-transparent")}
                    style={selectFieldStyle}
                    aria-invalid={!!fieldErrors.investmentAccountId}
                    {...formFieldAria("inv-account", fieldErrors.investmentAccountId)}
                    options={accounts.map((a) => ({
                      value: a.id,
                      label: `${a.name} (${a.bankName}) — ${formatCurrency(a.balance)}`,
                    }))}
                  />
                  <FormFieldError controlId="inv-account" message={fieldErrors.investmentAccountId} />
                </div>
              ) : (
                <p className="text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
                  No investment accounts found. Add one in Accounts first.
                </p>
              )}

              <div>
                <label htmlFor="inv-name" className={expenseFieldLabelClass} style={{ color: TOKENS.onSurfaceMuted }}>
                  Investment name / ticker *
                </label>
                <Input
                  id="inv-name"
                  type="text"
                  value={investmentName}
                  onChange={(e) => { setInvestmentName(e.target.value); clearFieldError("investmentName") }}
                  placeholder="e.g. VAS, AAPL"
                  className={cn(expenseConsoleField, "border-transparent")}
                  style={fieldStyle}
                  aria-invalid={!!fieldErrors.investmentName}
                  {...formFieldAria("inv-name", fieldErrors.investmentName)}
                />
                <FormFieldError controlId="inv-name" message={fieldErrors.investmentName} />
              </div>

              <div>
                <label htmlFor="inv-amount" className={expenseFieldLabelClass} style={{ color: TOKENS.onSurfaceMuted }}>
                  Total amount *
                </label>
                <Input
                  id="inv-amount"
                  type="number"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); clearFieldError("amount") }}
                  min="0" step="0.01" placeholder="0.00"
                  className={cn(expenseConsoleField, "border-transparent")}
                  style={fieldStyle}
                  aria-invalid={!!fieldErrors.amount}
                  {...formFieldAria("inv-amount", fieldErrors.amount)}
                />
                <FormFieldError controlId="inv-amount" message={fieldErrors.amount} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="inv-units" className={expenseFieldLabelClass} style={{ color: TOKENS.onSurfaceMuted }}>
                    Units
                  </label>
                  <Input
                    id="inv-units"
                    type="number"
                    value={units}
                    onChange={(e) => setUnits(e.target.value)}
                    min="0" step="any" placeholder="0"
                    className={cn(expenseConsoleField, "border-transparent")}
                    style={fieldStyle}
                  />
                </div>
                <div>
                  <label htmlFor="inv-price" className={expenseFieldLabelClass} style={{ color: TOKENS.onSurfaceMuted }}>
                    Price / unit
                  </label>
                  <Input
                    id="inv-price"
                    type="number"
                    value={pricePerUnit}
                    onChange={(e) => setPricePerUnit(e.target.value)}
                    min="0" step="0.0001" placeholder="0.00"
                    className={cn(expenseConsoleField, "border-transparent")}
                    style={fieldStyle}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="inv-date" className={expenseFieldLabelClass} style={{ color: TOKENS.onSurfaceMuted }}>
                  Date *
                </label>
                <DateInput
                  id="inv-date"
                  value={date}
                  onChange={(e) => { setDate(e.target.value); clearFieldError("date") }}
                  disabled={submitting}
                  className={cn(expenseConsoleField, "border-transparent")}
                  style={fieldStyle}
                  aria-invalid={!!fieldErrors.date}
                  {...formFieldAria("inv-date", fieldErrors.date)}
                />
                <FormFieldError controlId="inv-date" message={fieldErrors.date} />
              </div>
            </fieldset>

            <button
              type="submit"
              disabled={submitting || accounts.length === 0}
              className={cn("w-full min-h-11 rounded-xl py-3.5 text-xs font-bold uppercase tracking-[0.2em] transition-opacity disabled:opacity-50", consoleFocus)}
              style={{ background: TOKENS.primary, color: TOKENS.surface, boxShadow: "0 12px 28px rgba(0,0,0,0.25)" }}
            >
              {submitting ? "Logging…" : "Log investment"}
            </button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
