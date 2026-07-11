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
import { getLocalDateString } from "@/lib/date-utils"
import { buildFieldErrors, hasFieldErrors, requireField, requirePositiveNumber, requireSelection } from "@/lib/form-validation"
import { useFormFieldErrors } from "@/hooks/use-form-field-errors"
import { FormErrorAlert } from "@/components/wealth-console/form-status-alert"
import { FormFieldError, formFieldAria } from "@/components/forms/form-field-error"
import { cn } from "@/lib/utils"
import { consoleFocus } from "@/components/wealth-console/console-ui"
import { expenseConsoleField, expenseFieldLabelClass } from "@/components/expenses/expense-console-ui"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { toastError, toastSuccess } from "@/lib/app-toast"

type FieldKey = "superAccountId" | "amount" | "date"

interface SuperAccount {
  id: string
  name: string
}

interface AddSuperContributionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void | Promise<void>
}

const CONTRIB_TYPES = [
  { value: "employer", label: "Employer (SG)" },
  { value: "salary_sacrifice", label: "Salary Sacrifice" },
  { value: "personal", label: "Personal" },
  { value: "government", label: "Govt Co-contribution" },
  { value: "investment", label: "Investment Return" },
]

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

export function AddSuperContributionModal({
  open,
  onOpenChange,
  onSuccess,
}: AddSuperContributionModalProps) {
  const { currencyCode } = useFormatCurrency()
  const [accounts, setAccounts] = useState<SuperAccount[]>([])
  const [superAccountId, setSuperAccountId] = useState("")
  const [type, setType] = useState("employer")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const { fieldErrors, setFieldErrors, clearFieldError, clearFieldErrors } =
    useFormFieldErrors<FieldKey>()

  useEffect(() => {
    if (!open) return
    setDate(getLocalDateString())
    fetch("/api/superannuation").then(async (res) => {
      if (!res.ok) return
      const data = await res.json()
      const list: SuperAccount[] = (data.accounts ?? []).map((a: { id: string; name: string }) => ({
        id: a.id,
        name: a.name,
      }))
      setAccounts(list)
      if (list.length > 0 && !superAccountId) setSuperAccountId(list[0].id)
    })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => {
    setAmount("")
    setDescription("")
    setType("employer")
    clearFieldErrors()
    setFormError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const errs = buildFieldErrors<FieldKey>([
      ["superAccountId", requireSelection(superAccountId, "a super account")],
      ["amount", requirePositiveNumber(amount, "Amount")],
      ["date", requireField(date, "Date")],
    ])
    if (hasFieldErrors(errs)) { setFieldErrors(errs); return }
    clearFieldErrors()

    setSubmitting(true)
    try {
      const res = await fetch("/api/superannuation/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          superAccountId,
          amount: parseMoneyInput(amount, currencyCode),
          type,
          date,
          description: description.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to record contribution")
      toastSuccess("Contribution recorded!")
      reset()
      onOpenChange(false)
      await onSuccess?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to record contribution"
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
              Record super contribution
            </DialogTitle>
            <DialogDescription className="text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
              Employer SG, salary sacrifice, or personal contributions.
            </DialogDescription>
          </DialogHeader>

          <form noValidate onSubmit={handleSubmit} className="mt-6 space-y-5" inert={submitting}>
            <FormErrorAlert error={formError} />
            <fieldset disabled={submitting} className="min-w-0 space-y-5 border-0 p-0">

              {accounts.length > 0 && (
                <div>
                  <label htmlFor="sa-account" className={expenseFieldLabelClass} style={{ color: TOKENS.onSurfaceMuted }}>
                    Super account *
                  </label>
                  <AppSelect
                    id="sa-account"
                    value={superAccountId}
                    onValueChange={(v) => { setSuperAccountId(v); clearFieldError("superAccountId") }}
                    disabled={submitting}
                    className={cn(expenseConsoleField, "mt-1 border-transparent")}
                    style={selectFieldStyle}
                    aria-invalid={!!fieldErrors.superAccountId}
                    {...formFieldAria("sa-account", fieldErrors.superAccountId)}
                    options={accounts.map((a) => ({ value: a.id, label: a.name }))}
                  />
                  <FormFieldError controlId="sa-account" message={fieldErrors.superAccountId} />
                </div>
              )}

              <div>
                <label htmlFor="sa-type" className={expenseFieldLabelClass} style={{ color: TOKENS.onSurfaceMuted }}>
                  Contribution type
                </label>
                <AppSelect
                  id="sa-type"
                  value={type}
                  onValueChange={setType}
                  disabled={submitting}
                  className={cn(expenseConsoleField, "mt-1 border-transparent")}
                  style={selectFieldStyle}
                  options={CONTRIB_TYPES}
                />
              </div>

              <div>
                <label htmlFor="sa-amount" className={expenseFieldLabelClass} style={{ color: TOKENS.onSurfaceMuted }}>
                  Amount *
                </label>
                <Input
                  id="sa-amount"
                  type="number"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); clearFieldError("amount") }}
                  min="0" step="0.01" placeholder="0.00"
                  className={cn(expenseConsoleField, "border-transparent")}
                  style={fieldStyle}
                  {...formFieldAria("sa-amount", fieldErrors.amount)}
                />
                <FormFieldError controlId="sa-amount" message={fieldErrors.amount} />
              </div>

              <div>
                <label htmlFor="sa-date" className={expenseFieldLabelClass} style={{ color: TOKENS.onSurfaceMuted }}>
                  Date *
                </label>
                <DateInput
                  id="sa-date"
                  value={date}
                  onChange={(e) => { setDate(e.target.value); clearFieldError("date") }}
                  disabled={submitting}
                  className={cn(expenseConsoleField, "border-transparent")}
                  style={fieldStyle}
                  aria-invalid={!!fieldErrors.date}
                  {...formFieldAria("sa-date", fieldErrors.date)}
                />
                <FormFieldError controlId="sa-date" message={fieldErrors.date} />
              </div>

              <div>
                <label htmlFor="sa-desc" className={expenseFieldLabelClass} style={{ color: TOKENS.onSurfaceMuted }}>
                  Description
                </label>
                <Input
                  id="sa-desc"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. June 2026 SG"
                  className={cn(expenseConsoleField, "border-transparent")}
                  style={fieldStyle}
                />
              </div>
            </fieldset>

            <button
              type="submit"
              disabled={submitting}
              className={cn("w-full min-h-11 rounded-xl py-3.5 text-xs font-bold uppercase tracking-[0.2em] transition-opacity disabled:opacity-50", consoleFocus)}
              style={{ background: TOKENS.primary, color: TOKENS.surface, boxShadow: "0 12px 28px rgba(0,0,0,0.25)" }}
            >
              {submitting ? "Recording…" : "Record contribution"}
            </button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
