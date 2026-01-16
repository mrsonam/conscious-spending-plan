"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { ExpensesSkeleton } from "@/components/skeletons/expenses-skeleton"
import { ExpensesListSkeleton } from "@/components/skeletons/expenses-sections"
import { Plus, Trash2, TrendingDown, Calendar } from "lucide-react"

interface Account {
  id: string
  name: string
  bankName: string
  accountType: string
  balance: number
  isDefault: boolean
}

interface Expense {
  id: string
  accountId: string
  amount: number
  description: string | null
  category: string | null
  expenseCategory: string | null
  date: string
  createdAt: string
  account: {
    id: string
    name: string
    bankName: string
  }
}

export default function ExpensesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loadingExpenses, setLoadingExpenses] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Form states
  const [accountId, setAccountId] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [fundCategory, setFundCategory] = useState("")
  const [expenseCategory, setExpenseCategory] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [submitting, setSubmitting] = useState(false)

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

  // Filter states
  const [filterStartDate, setFilterStartDate] = useState("")
  const [filterEndDate, setFilterEndDate] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated") {
      fetchAccounts()
      fetchExpenses()
    }
  }, [status, router])

  const fetchAccounts = async () => {
    setLoadingAccounts(true)
    try {
      const response = await fetch("/api/accounts")
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.accounts || [])
        if (data.accounts && data.accounts.length > 0) {
          const defaultAccount = data.accounts.find((acc: Account) => acc.isDefault)
          setAccountId(defaultAccount?.id || data.accounts[0].id)
        }
      }
    } catch (error) {
      console.error("Error fetching accounts:", error)
    } finally {
      setLoadingAccounts(false)
    }
  }

  const fetchExpenses = async () => {
    setLoadingExpenses(true)
    try {
      let url = "/api/expenses"
      const params = new URLSearchParams()
      if (filterStartDate) params.append("startDate", filterStartDate)
      if (filterEndDate) params.append("endDate", filterEndDate)
      if (params.toString()) url += "?" + params.toString()

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setExpenses(data.expenses || [])
      }
    } catch (error) {
      console.error("Error fetching expenses:", error)
    } finally {
      setLoadingExpenses(false)
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      fetchExpenses()
    }
  }, [filterStartDate, filterEndDate, status])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!accountId || !amount || !date) {
      setMessage({ type: "error", text: "Please fill in all required fields" })
      return
    }

    const selectedAccount = accounts.find(acc => acc.id === accountId)
    const isCashAccount = selectedAccount?.accountType === "cash"

    // Fund category is only required for non-cash accounts
    if (!isCashAccount && !fundCategory) {
      setMessage({ type: "error", text: "Please select a fund category" })
      return
    }

    const amountNum = parseFloat(amount)
    if (amountNum <= 0) {
      setMessage({ type: "error", text: "Amount must be greater than 0" })
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
        setMessage({ type: "success", text: "Expense logged successfully!" })
        setAmount("")
        setDescription("")
        setFundCategory("")
        setExpenseCategory("")
        setShowAddForm(false)
        fetchExpenses()
        fetchAccounts() // Refresh accounts to update balances
      } else {
        setMessage({ type: "error", text: data.error || "Failed to log expense" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" })
    } finally {
      setSubmitting(false)
    }
  }

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null)

  const handleDelete = async (expenseId: string) => {
    setExpenseToDelete(expenseId)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!expenseToDelete) return

    try {
      const response = await fetch(`/api/expenses?id=${expenseToDelete}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setMessage({ type: "success", text: "Expense deleted successfully" })
        fetchExpenses()
        fetchAccounts() // Refresh accounts to update balances
      } else {
        const data = await response.json()
        setMessage({ type: "error", text: data.error || "Failed to delete expense" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" })
    } finally {
      setExpenseToDelete(null)
      setShowDeleteConfirm(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (status === "loading") {
    return (
      <>
        <Header title="Expenses" />
        <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6">
          <ExpensesSkeleton />
        </div>
      </>
    )
  }

  if (!session) return null

  return (
    <>
      <Header title="Expenses" />
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {message && (
          <div
            className={`p-3 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Expense Log</h2>
            <p className="text-sm text-gray-500 mt-1">Track your expenses and view history</p>
          </div>
          <Button
            onClick={() => {
              setShowAddForm(!showAddForm)
              setMessage(null)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {showAddForm ? "Cancel" : "Add Expense"}
          </Button>
        </div>

        {/* Add Expense Form */}
        {showAddForm && (
          <Card>
            <CardHeader>
              <CardTitle>Log New Expense</CardTitle>
              <CardDescription>Deduct amount from an account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="account">Account *</Label>
                    <select
                      id="account"
                      value={accountId}
                      onChange={(e) => {
                        setAccountId(e.target.value)
                        // Clear fund category if switching to cash account
                        const selectedAccount = accounts.find(acc => acc.id === e.target.value)
                        if (selectedAccount?.accountType === "cash") {
                          setFundCategory("")
                        }
                      }}
                      required
                      className="mt-1 w-full px-4 py-2 border-0 bg-gray-50 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    >
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({account.bankName}) - {formatCurrency(account.balance)}
                        </option>
                      ))}
                    </select>
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
                    <Input
                      id="date"
                      type="date"
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
                        <select
                          id="fundCategory"
                          value={fundCategory}
                          onChange={(e) => setFundCategory(e.target.value)}
                          required
                          className="mt-1 w-full px-4 py-2 bg-gray-50 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                        >
                          <option value="">Select a fund category</option>
                          {FUND_CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                          Select which fund this expense belongs to
                        </p>
                      </div>
                    )
                  })()}
                  <div>
                    <Label htmlFor="expenseCategory">Expense Category</Label>
                    <select
                      id="expenseCategory"
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value)}
                      className="mt-1 w-full px-4 py-2 bg-gray-50 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    >
                      <option value="">Select an expense category (optional)</option>
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the expense"
                    className="mt-1"
                  />
                </div>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? "Logging..." : "Log Expense"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Filter by Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="filterStartDate">Start Date</Label>
                <Input
                  id="filterStartDate"
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="filterEndDate">End Date</Label>
                <Input
                  id="filterEndDate"
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            {(filterStartDate || filterEndDate) && (
              <Button
                variant="outline"
                onClick={() => {
                  setFilterStartDate("")
                  setFilterEndDate("")
                }}
                className="mt-4"
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Expenses List */}
        {loadingExpenses ? (
          <ExpensesListSkeleton />
        ) : (
        <Card>
          <CardHeader>
            <CardTitle>Expense History</CardTitle>
            <CardDescription>
              {expenses.length === 0
                ? "No expenses logged yet"
                : `${expenses.length} expense${expenses.length !== 1 ? "s" : ""} found`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <div className="text-center py-12">
                <TrendingDown className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">No expenses yet</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Start tracking your expenses by adding your first expense
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 shadow-sm"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(expense.amount)}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {expense.account.name} ({expense.account.bankName})
                          </div>
                          {expense.description && (
                            <div className="text-sm text-gray-500 mt-1">{expense.description}</div>
                          )}
                          <div className="flex gap-2 mt-1 flex-wrap">
                            {expense.category && (
                              <span className="inline-block px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded">
                                Fund: {FUND_CATEGORIES.find(c => c.value === expense.category)?.label || expense.category}
                              </span>
                            )}
                            {expense.expenseCategory && (
                              <span className="inline-block px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                                {EXPENSE_CATEGORIES.find(c => c.value === expense.expenseCategory)?.label || expense.expenseCategory}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-700">
                            {formatDate(expense.date)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(expense.id)}
                      className="ml-4"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        )}

        <ConfirmDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          title="Delete Expense"
          description="Are you sure you want to delete this expense? The amount will be restored to the account."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDelete}
          variant="destructive"
        />
      </div>
    </>
  )
}
