"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DateInput } from "@/components/ui/date-input"
import { Label } from "@/components/ui/label"
import { AppSelect } from "@/components/ui/app-select"
import { useFormatCurrency } from "@/hooks/use-format-currency"

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
  const [error, setError] = useState("")

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
    setError("")

    const selectedAccount = accounts.find(acc => acc.id === accountId)
    const isCashAccount = selectedAccount?.accountType === "cash"

    if (!accountId || !amount || !date) {
      setError("Please fill in all required fields")
      return
    }

    // Fund category is only required for non-cash accounts
    if (!isCashAccount && !fundCategory) {
      setError("Please select a fund category")
      return
    }

    const amountNum = parseFloat(amount)
    if (amountNum <= 0) {
      setError("Amount must be greater than 0")
      return
    }

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
        setError(data.error || "Failed to log expense")
      }
    } catch (error) {
      setError("An error occurred")
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
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div>
              <Label htmlFor="account">Account *</Label>
              <AppSelect
                id="account"
                value={accountId}
                onValueChange={(v) => {
                  setAccountId(v)
                  const selectedAccount = accounts.find((acc) => acc.id === v)
                  if (selectedAccount?.accountType === "cash") {
                    setFundCategory("")
                  }
                }}
                required
                variant="classic"
                className="mt-1 rounded-lg"
                options={accounts.map((account) => ({
                  value: account.id,
                  label: `${account.name} (${account.bankName}) - ${formatCurrency(account.balance)}`,
                }))}
              />
            </div>
            <div>
              <Label htmlFor="amount">Amount ($) *</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
                required
                placeholder="0.00"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="date">Date *</Label>
              <DateInput
                id="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="mt-1"
              />
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
                    onValueChange={setFundCategory}
                    required
                    variant="classic"
                    className="mt-1 rounded-lg"
                    placeholder="Select a fund category"
                    options={[
                      { value: "", label: "Select a fund category" },
                      ...FUND_CATEGORIES.map((cat) => ({
                        value: cat.value,
                        label: cat.label,
                      })),
                    ]}
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
              placeholder="e.g., Groceries, Rent, etc."
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Add Expense"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
