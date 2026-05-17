"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DateInput } from "@/components/ui/date-input"
import { Label } from "@/components/ui/label"
import { AppSelect } from "@/components/ui/app-select"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import {
  buildFieldErrors,
  hasFieldErrors,
  requireField,
  requirePositiveNumber,
  requireSelection,
} from "@/lib/form-validation"
import { useFormFieldErrors } from "@/hooks/use-form-field-errors"
import { FormErrorAlert } from "@/components/wealth-console/form-status-alert"
import { FormFieldError, formFieldAria } from "@/components/forms/form-field-error"

type ExpenseModalFieldKey = "accountId" | "amount" | "date" | "fundCategory"

interface Account {
  id: string
  name: string
  bankName: string
  balance: number
  accountType: string
}

interface AddExpenseModalProps {
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

const EXPENSE_CATEGORIES = [
  { value: "groceries", label: "Groceries" },
  { value: "food", label: "Food & Dining" },
  { value: "transport", label: "Transportation" },
  { value: "gas", label: "Gas & Fuel" },
  { value: "bills", label: "Bills & Utilities" },
  { value: "rent", label: "Rent & Mortgage" },
  { value: "insurance", label: "Insurance" },
  { value: "entertainment", label: "Entertainment" },
  { value: "shopping", label: "Shopping" },
  { value: "clothing", label: "Clothing & Apparel" },
  { value: "healthcare", label: "Healthcare" },
  { value: "pharmacy", label: "Pharmacy & Medicine" },
  { value: "education", label: "Education" },
  { value: "subscriptions", label: "Subscriptions" },
  { value: "personal", label: "Personal Care" },
  { value: "gifts", label: "Gifts & Donations" },
  { value: "travel", label: "Travel" },
  { value: "home", label: "Home & Garden" },
  { value: "pet", label: "Pet Care" },
  { value: "fitness", label: "Fitness & Sports" },
  { value: "technology", label: "Technology & Electronics" },
  { value: "other", label: "Other" },
]

export function AddExpenseModal({ open, onOpenChange, onSuccess }: AddExpenseModalProps) {
  const { formatCurrency } = useFormatCurrency()
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
    if (open) {
      const today = new Date()
      setDate(today.toISOString().split("T")[0])
      
      fetch("/api/accounts").then(res => {
        if (res.ok) {
          res.json().then(data => {
            setAccounts(data.accounts || [])
            if (data.accounts?.length > 0) {
              setAccountId(data.accounts[0].id)
            }
          })
        }
      })
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const selectedAccount = accounts.find(acc => acc.id === accountId)
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

    const amountNum = parseFloat(amount)

    setSubmitting(true)

    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          amount: amountNum,
          description: description || null,
          category: fundCategory || null,
          expenseCategory: expenseCategory || null,
          date,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setAmount("")
        setDescription("")
        setFundCategory("")
        setExpenseCategory("")
        onOpenChange(false)
        if (onSuccess) onSuccess()
      } else {
        setFormError(data.error || "Failed to log expense")
      }
    } catch {
      setFormError("An error occurred")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogClose onClose={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
          <DialogDescription>Log a new expense and deduct from an account</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={handleSubmit} className="space-y-4" inert={submitting}>
          <FormErrorAlert error={formError} variant="classic" />

          <fieldset disabled={submitting} className="min-w-0 space-y-4 border-0 p-0">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div>
              <Label htmlFor="account">Account *</Label>
              <AppSelect
                id="account"
                value={accountId}
                onValueChange={(v) => {
                  setAccountId(v)
                  clearFieldError("accountId")
                  const selectedAccount = accounts.find((acc) => acc.id === v)
                  if (selectedAccount?.accountType === "cash") {
                    setFundCategory("")
                  }
                }}
                disabled={submitting}
                variant="classic"
                className="mt-1 rounded-lg"
                options={accounts.map((account) => ({
                  value: account.id,
                  label: `${account.name} (${account.bankName}) - ${formatCurrency(account.balance)}`,
                }))}
                aria-invalid={!!fieldErrors.accountId}
                {...formFieldAria("account", fieldErrors.accountId)}
              />
              <FormFieldError controlId="account" message={fieldErrors.accountId} variant="classic" />
            </div>
            <div>
              <Label htmlFor="amount">Amount ($) *</Label>
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
                className="mt-1"
                {...formFieldAria("amount", fieldErrors.amount)}
              />
              <FormFieldError controlId="amount" message={fieldErrors.amount} variant="classic" />
            </div>
            <div>
              <Label htmlFor="date">Date *</Label>
              <DateInput
                id="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value)
                  clearFieldError("date")
                }}
                disabled={submitting}
                className="mt-1"
                aria-invalid={!!fieldErrors.date}
                {...formFieldAria("date", fieldErrors.date)}
              />
              <FormFieldError controlId="date" message={fieldErrors.date} variant="classic" />
            </div>
            {(() => {
              const selectedAccount = accounts.find(acc => acc.id === accountId)
              const isCashAccount = selectedAccount?.accountType === "cash"
              
              if (isCashAccount) {
                return null // Don't show fund category for cash accounts
              }
              
              return (
                <div>
                  <Label htmlFor="fundCategory">Fund Category *</Label>
                  <AppSelect
                    id="fundCategory"
                    value={fundCategory}
                    onValueChange={(v) => {
                      setFundCategory(v)
                      clearFieldError("fundCategory")
                    }}
                    disabled={submitting}
                    variant="classic"
                    className="mt-1 rounded-lg"
                    placeholder="Select a fund category"
                    aria-invalid={!!fieldErrors.fundCategory}
                    {...formFieldAria("fundCategory", fieldErrors.fundCategory)}
                    options={[
                      { value: "", label: "Select a fund category" },
                      ...FUND_CATEGORIES.map((cat) => ({
                        value: cat.value,
                        label: cat.label,
                      })),
                    ]}
                  />
                  <FormFieldError
                    controlId="fundCategory"
                    message={fieldErrors.fundCategory}
                    variant="classic"
                  />
                </div>
              )
            })()}
            <div>
              <Label htmlFor="expenseCategory">Expense Category</Label>
              <AppSelect
                id="expenseCategory"
                value={expenseCategory}
                onValueChange={setExpenseCategory}
                disabled={submitting}
                variant="classic"
                className="mt-1 rounded-lg"
                placeholder="Select an expense category (optional)"
                options={[
                  { value: "", label: "Select an expense category (optional)" },
                  ...EXPENSE_CATEGORIES.map((cat) => ({
                    value: cat.value,
                    label: cat.label,
                  })),
                ]}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              placeholder="e.g., Groceries, Rent, etc."
              className="mt-1"
            />
          </div>
          </fieldset>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Add Expense
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
