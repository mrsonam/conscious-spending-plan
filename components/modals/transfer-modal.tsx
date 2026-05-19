"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DateInput } from "@/components/ui/date-input"
import { Label } from "@/components/ui/label"
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

interface Account {
  id: string
  name: string
  bankName: string
  balance: number
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

  useEffect(() => {
    if (open) {
      const today = new Date()
      setTransferDate(today.toISOString().split("T")[0])

      fetch("/api/accounts").then((res) => {
        if (res.ok) {
          res.json().then((data) => {
            setAccounts(data.accounts || [])
          })
        }
      })
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
            ? requireDifferent(
                fromAccountId,
                toAccountId,
                "From account",
                "To account",
              )
            : null),
      ],
      ["transferAmount", requirePositiveNumber(transferAmount, "Amount")],
      ["transferDate", requireField(transferDate, "Transfer date")],
    ])
    if (hasFieldErrors(errs)) {
      setFieldErrors(errs)
      return
    }
    clearFieldErrors()

    const amountNum = parseMoneyInput(transferAmount, currencyCode)

    setTransferring(true)

    try {
      const response = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAccountId,
          toAccountId,
          amount: amountNum,
          description: transferDescription || null,
          category: transferCategory || null,
          date: transferDate,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setTransferAmount("")
        setTransferDescription("")
        setTransferCategory("")
        setFromAccountId("")
        setToAccountId("")
        onOpenChange(false)
        if (onSuccess) onSuccess()
      } else {
        setFormError(data.error || "Failed to create transfer")
      }
    } catch {
      setFormError("An error occurred")
    } finally {
      setTransferring(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogClose onClose={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle>Transfer Funds</DialogTitle>
          <DialogDescription>Move money between your accounts</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={handleTransfer} className="space-y-4" inert={transferring}>
          <FormErrorAlert error={formError} variant="classic" />

          <fieldset disabled={transferring} className="min-w-0 space-y-4 border-0 p-0">
          <div>
            <Label htmlFor="fromAccount">From Account *</Label>
            <AppSelect
              id="fromAccount"
              value={fromAccountId}
              onValueChange={(v) => {
                setFromAccountId(v)
                clearFieldError("fromAccountId")
              }}
              disabled={transferring}
              variant="classic"
              className="mt-1 rounded-lg border border-gray-300"
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
            <FormFieldError controlId="fromAccount" message={fieldErrors.fromAccountId} variant="classic" />
          </div>

          <div>
            <Label htmlFor="toAccount">To Account *</Label>
            <AppSelect
              id="toAccount"
              value={toAccountId}
              onValueChange={(v) => {
                setToAccountId(v)
                clearFieldError("toAccountId")
              }}
              disabled={transferring}
              variant="classic"
              className="mt-1 rounded-lg border border-gray-300"
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
            <FormFieldError controlId="toAccount" message={fieldErrors.toAccountId} variant="classic" />
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div>
              <Label htmlFor="transferDate">Transfer Date *</Label>
              <DateInput
                id="transferDate"
                value={transferDate}
                onChange={(e) => {
                  setTransferDate(e.target.value)
                  clearFieldError("transferDate")
                }}
                disabled={transferring}
                className="mt-1"
                aria-invalid={!!fieldErrors.transferDate}
                {...formFieldAria("transferDate", fieldErrors.transferDate)}
              />
              <FormFieldError controlId="transferDate" message={fieldErrors.transferDate} variant="classic" />
            </div>
            <div>
              <Label htmlFor="transferAmount">Amount *</Label>
              <Input
                id="transferAmount"
                type="number"
                value={transferAmount}
                onChange={(e) => {
                  setTransferAmount(e.target.value)
                  clearFieldError("transferAmount")
                }}
                min="0.01"
                step="0.01"
                disabled={transferring}
                placeholder="0.00"
                className="mt-1"
                {...formFieldAria("transferAmount", fieldErrors.transferAmount)}
              />
              <FormFieldError controlId="transferAmount" message={fieldErrors.transferAmount} variant="classic" />
            </div>
          </div>

          <div>
            <Label htmlFor="transferCategory">Fund Category (Optional)</Label>
            <AppSelect
              id="transferCategory"
              value={transferCategory}
              onValueChange={setTransferCategory}
              disabled={transferring}
              variant="classic"
              className="mt-1 rounded-lg border border-gray-300"
              placeholder="Optional"
              options={[
                { value: "", label: "None" },
                ...FUND_CATEGORIES.map((cat) => ({
                  value: cat.value,
                  label: cat.label,
                })),
              ]}
            />
          </div>

          <div>
            <Label htmlFor="transferDescription">Description (Optional)</Label>
            <Input
              id="transferDescription"
              type="text"
              value={transferDescription}
              onChange={(e) => setTransferDescription(e.target.value)}
              disabled={transferring}
              placeholder="Memo"
              className="mt-1"
            />
          </div>
          </fieldset>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={transferring}>
              Cancel
            </Button>
            <Button type="submit" disabled={transferring}>
              {transferring ? "Transferring..." : "Transfer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
