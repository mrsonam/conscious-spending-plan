"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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

export function TransferModal({ open, onOpenChange, onSuccess }: TransferModalProps) {
  const [fromAccountId, setFromAccountId] = useState("")
  const [toAccountId, setToAccountId] = useState("")
  const [transferAmount, setTransferAmount] = useState("")
  const [transferDescription, setTransferDescription] = useState("")
  const [transferDate, setTransferDate] = useState("")
  const [transferCategory, setTransferCategory] = useState("")
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transferring, setTransferring] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      const today = new Date()
      setTransferDate(today.toISOString().split("T")[0])
      
      fetch("/api/accounts").then(res => {
        if (res.ok) {
          res.json().then(data => {
            setAccounts(data.accounts || [])
          })
        }
      })
    }
  }, [open])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!fromAccountId || !toAccountId || !transferAmount || !transferDate) {
      setError("Please fill in all required fields")
      return
    }

    if (fromAccountId === toAccountId) {
      setError("From and To accounts must be different")
      return
    }

    const amountNum = parseFloat(transferAmount)
    if (amountNum <= 0) {
      setError("Amount must be greater than 0")
      return
    }

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
        setError(data.error || "Failed to create transfer")
      }
    } catch (error) {
      setError("An error occurred")
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
        <form onSubmit={handleTransfer} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <div>
            <Label htmlFor="fromAccount">From Account *</Label>
            <select
              id="fromAccount"
              value={fromAccountId}
              onChange={(e) => setFromAccountId(e.target.value)}
              required
              className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select account</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatCurrency(acc.balance)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="toAccount">To Account *</Label>
            <select
              id="toAccount"
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              required
              className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select account</option>
              {accounts
                .filter((acc) => acc.id !== fromAccountId)
                .map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatCurrency(acc.balance)})
                  </option>
                ))}
            </select>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div>
              <Label htmlFor="transferDate">Transfer Date *</Label>
              <Input
                id="transferDate"
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="transferAmount">Amount *</Label>
              <Input
                id="transferAmount"
                type="number"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                min="0.01"
                step="0.01"
                required
                placeholder="0.00"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="transferCategory">Fund Category (Optional)</Label>
            <select
              id="transferCategory"
              value={transferCategory}
              onChange={(e) => setTransferCategory(e.target.value)}
              className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">None</option>
              {FUND_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Track this transfer for a specific fund category
            </p>
          </div>

          <div>
            <Label htmlFor="transferDescription">Description (Optional)</Label>
            <Input
              id="transferDescription"
              type="text"
              value={transferDescription}
              onChange={(e) => setTransferDescription(e.target.value)}
              placeholder="e.g., Monthly savings transfer"
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
