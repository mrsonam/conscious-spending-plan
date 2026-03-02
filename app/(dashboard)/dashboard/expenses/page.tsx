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
import { Plus, Trash2, TrendingDown, Calendar, ChevronLeft, ChevronRight, Repeat, Play, ClipboardList } from "lucide-react"

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

interface RecurringExpense {
  id: string
  accountId: string
  amount: number
  description: string | null
  category: string | null
  expenseCategory: string | null
  frequency: string
  startDate: string
  endDate: string | null
  isActive: boolean
  account: { id: string; name: string; bankName: string }
}

export default function ExpensesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expensesTotal, setExpensesTotal] = useState(0)
  const [expensesPage, setExpensesPage] = useState(1)
  const expensesLimit = 10
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

  // Recurring expenses
  const [recurring, setRecurring] = useState<RecurringExpense[]>([])
  const [loadingRecurring, setLoadingRecurring] = useState(false)
  const [showRecurringForm, setShowRecurringForm] = useState(false)
  const [loggingRecurringId, setLoggingRecurringId] = useState<string | null>(null)
  const [recurringDeleteId, setRecurringDeleteId] = useState<string | null>(null)
  const [showRecurringDeleteConfirm, setShowRecurringDeleteConfirm] = useState(false)
  const [recurringAccountId, setRecurringAccountId] = useState("")
  const [recurringAmount, setRecurringAmount] = useState("")
  const [recurringDescription, setRecurringDescription] = useState("")
  const [recurringFundCategory, setRecurringFundCategory] = useState("")
  const [recurringExpenseCategory, setRecurringExpenseCategory] = useState("")
  const [recurringFrequency, setRecurringFrequency] = useState("monthly")
  const [recurringStartDate, setRecurringStartDate] = useState(new Date().toISOString().split("T")[0])
  const [recurringEndDate, setRecurringEndDate] = useState("")
  const [submittingRecurring, setSubmittingRecurring] = useState(false)

  // Bulk expenses
  const [showBulkForm, setShowBulkForm] = useState(false)
  const [bulkText, setBulkText] = useState("")
  const [bulkFundCategory, setBulkFundCategory] = useState("")
  const [bulkExpenseCategory, setBulkExpenseCategory] = useState("")
  const [bulkAccountId, setBulkAccountId] = useState("")
  const [submittingBulk, setSubmittingBulk] = useState(false)

  const FREQUENCIES = [
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
  ]

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated") {
      fetchAccounts()
      fetchExpenses(1)
      fetchRecurring()
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

  const fetchExpenses = async (page: number = 1) => {
    setLoadingExpenses(true)
    try {
      const params = new URLSearchParams()
      if (filterStartDate) params.append("startDate", filterStartDate)
      if (filterEndDate) params.append("endDate", filterEndDate)
      params.set("page", String(page))
      params.set("limit", String(expensesLimit))

      const response = await fetch(`/api/expenses?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setExpenses(data.expenses || [])
        setExpensesTotal(data.total ?? 0)
        setExpensesPage(data.page ?? 1)
      }
    } catch (error) {
      console.error("Error fetching expenses:", error)
    } finally {
      setLoadingExpenses(false)
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      setExpensesPage(1)
      fetchExpenses(1)
    }
  }, [filterStartDate, filterEndDate, status])

  const fetchRecurring = async () => {
    setLoadingRecurring(true)
    try {
      const res = await fetch("/api/recurring-expenses")
      if (res.ok) {
        const data = await res.json()
        setRecurring(data.recurring || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingRecurring(false)
    }
  }

  const handleAddRecurring = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    const amountNum = parseFloat(recurringAmount)
    if (!recurringAccountId || !recurringAmount || isNaN(amountNum) || amountNum <= 0) {
      setMessage({ type: "error", text: "Account and a positive amount are required." })
      return
    }
    setSubmittingRecurring(true)
    try {
      const res = await fetch("/api/recurring-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: recurringAccountId,
          amount: amountNum,
          description: recurringDescription || null,
          category: recurringFundCategory || null,
          expenseCategory: recurringExpenseCategory || null,
          frequency: recurringFrequency,
          startDate: recurringStartDate || null,
          endDate: recurringEndDate || null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: "success", text: "Recurring expense added." })
        setRecurringAmount("")
        setRecurringDescription("")
        setRecurringFundCategory("")
        setRecurringExpenseCategory("")
        setRecurringFrequency("monthly")
        setRecurringStartDate(new Date().toISOString().split("T")[0])
        setRecurringEndDate("")
        setShowRecurringForm(false)
        fetchRecurring()
      } else {
        setMessage({ type: "error", text: data.error || "Failed to add recurring expense." })
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred." })
    } finally {
      setSubmittingRecurring(false)
    }
  }

  const handleLogRecurring = async (id: string) => {
    setLoggingRecurringId(id)
    setMessage(null)
    try {
      const res = await fetch(`/api/recurring-expenses/${id}/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: new Date().toISOString().split("T")[0] }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: "success", text: "Expense logged for today." })
        fetchAccounts()
        fetchExpenses(1)
      } else {
        setMessage({ type: "error", text: data.error || "Failed to log expense." })
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred." })
    } finally {
      setLoggingRecurringId(null)
    }
  }

  const handleDeleteRecurring = (id: string) => {
    setRecurringDeleteId(id)
    setShowRecurringDeleteConfirm(true)
  }

  const confirmDeleteRecurring = async () => {
    if (!recurringDeleteId) return
    try {
      const res = await fetch(`/api/recurring-expenses/${recurringDeleteId}`, { method: "DELETE" })
      if (res.ok) {
        setMessage({ type: "success", text: "Recurring expense removed." })
        setRecurring((prev) => prev.filter((r) => r.id !== recurringDeleteId))
      } else {
        const data = await res.json()
        setMessage({ type: "error", text: data.error || "Failed to delete." })
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred." })
    } finally {
      setRecurringDeleteId(null)
      setShowRecurringDeleteConfirm(false)
    }
  }

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
        fetchExpenses(1)
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

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    const today = new Date().toISOString().split("T")[0]

    const resolveFundCategory = (raw: string | undefined): string | null => {
      if (!raw || !raw.trim()) return null
      const s = raw.trim()
      const byValue = FUND_CATEGORIES.find((c) => c.value === s)
      if (byValue) return byValue.value
      const byLabel = FUND_CATEGORIES.find((c) => c.label.toLowerCase() === s.toLowerCase())
      return byLabel ? byLabel.value : null
    }
    const resolveExpenseCategory = (raw: string | undefined): string | null => {
      if (!raw || !raw.trim()) return null
      const s = raw.trim()
      const byValue = EXPENSE_CATEGORIES.find((c) => c.value === s)
      if (byValue) return byValue.value
      const byLabel = EXPENSE_CATEGORIES.find((c) => c.label.toLowerCase() === s.toLowerCase())
      return byLabel ? byLabel.value : null
    }

    const parseBulkDate = (raw: string | undefined): string | null => {
      if (!raw || !raw.trim()) return null
      const s = raw.trim()
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
      const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
      if (dmy) {
        const [, d, m, y] = dmy
        const day = d.padStart(2, "0")
        const month = m.padStart(2, "0")
        return `${y}-${month}-${day}`
      }
      return null
    }

    const lines = bulkText
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (lines.length === 0) {
      setMessage({ type: "error", text: "Paste at least one line. Columns: date, amount, description, fund category, expense category (last 3 optional)." })
      return
    }
    const selectedAccount = accounts.find((a) => a.id === (bulkAccountId || undefined))
    const isCashAccount = selectedAccount?.accountType === "cash"

    const expenses = lines.map((line) => {
      const parts = line.split(/[\t,]/).map((p) => p.trim())
      const dateRaw = parts[0]
      const amount = parseFloat(parts[1])
      const description = parts[2] || null
      const part3 = parts[3]
      const part4 = parts[4]
      const parsedDate = parseBulkDate(dateRaw)
      const date = parsedDate ?? today
      const fundFromRow = resolveFundCategory(part3)
      const expenseFromRow = resolveExpenseCategory(part4)
      const category = (fundFromRow ?? bulkFundCategory) || null
      const expenseCategory = (expenseFromRow ?? bulkExpenseCategory) || null
      return {
        amount: Number.isFinite(amount) ? amount : 0,
        description,
        category,
        expenseCategory,
        date,
      }
    })

    const invalidAmount = expenses.filter((r) => r.amount <= 0)
    if (invalidAmount.length > 0) {
      setMessage({ type: "error", text: "Every line must start with a valid positive number (amount)." })
      return
    }
    if (!isCashAccount) {
      const missingFund = expenses.filter((r) => !r.category)
      if (missingFund.length > 0) {
        setMessage({
          type: "error",
          text: "Fund category is required for non-cash account. Add it in the paste (column 4) or set a default above.",
        })
        return
      }
    }

    setSubmittingBulk(true)
    try {
      const response = await fetch("/api/expenses/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: bulkAccountId || undefined,
          expenses,
        }),
      })
      const data = await response.json()
      if (response.ok) {
        setMessage({ type: "success", text: `${data.created} expense(s) added. Total: $${(data.total ?? 0).toFixed(2)}` })
        setBulkText("")
        setShowBulkForm(false)
        fetchExpenses(1)
        fetchAccounts()
      } else {
        setMessage({ type: "error", text: data.error || "Bulk add failed" })
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred" })
    } finally {
      setSubmittingBulk(false)
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
        const nextPage = expenses.length <= 1 && expensesPage > 1 ? expensesPage - 1 : expensesPage
        fetchExpenses(nextPage)
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

        <div className="flex flex-wrap justify-between items-center gap-2">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Expense Log</h2>
            <p className="text-sm text-gray-500 mt-1">Track your expenses and view history</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={showBulkForm ? "outline" : "default"}
              onClick={() => {
                setShowBulkForm(!showBulkForm)
                setMessage(null)
                if (accounts.length && !bulkAccountId) {
                  setBulkAccountId(accounts.find((a) => a.isDefault)?.id || accounts[0].id)
                }
              }}
            >
              <ClipboardList className="mr-2 h-4 w-4" />
              {showBulkForm ? "Cancel" : "Bulk add"}
            </Button>
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
        </div>

        {/* Bulk add form */}
        {showBulkForm && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Bulk add expenses
              </CardTitle>
              <CardDescription>
                One expense per line. Columns (comma or tab): <strong>amount</strong>, description, date (DD/MM/YYYY or YYYY-MM-DD), fund category, expense category. Last 4 are optional; use defaults below when omitted. Fund: fixedCosts, investment, savings, guiltFreeSpending (or labels like &quot;Guilt-Free Spending&quot;). Expense: groceries, food, bills, etc. (or labels like &quot;Food &amp; Dining&quot;).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBulkSubmit} className="space-y-4">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div>
                    <Label>Account (Smart Access / default)</Label>
                    <select
                      value={bulkAccountId}
                      onChange={(e) => setBulkAccountId(e.target.value)}
                      className="mt-1 w-full px-4 py-2 border-0 bg-gray-50 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.bankName}) {acc.isDefault ? "— default" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Default fund category (used when not in paste)</Label>
                    <select
                      value={bulkFundCategory}
                      onChange={(e) => setBulkFundCategory(e.target.value)}
                      className="mt-1 w-full px-4 py-2 border-0 bg-gray-50 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    >
                      <option value="">—</option>
                      {FUND_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Default expense category (used when not in paste)</Label>
                    <select
                      value={bulkExpenseCategory}
                      onChange={(e) => setBulkExpenseCategory(e.target.value)}
                      className="mt-1 w-full px-4 py-2 border-0 bg-gray-50 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    >
                      <option value="">—</option>
                      {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <Label>Paste expenses (one per line)</Label>
                  <textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={"50, lunch, 26/02/2026, guiltFreeSpending, food\n12.5, coffee, 10/02/2026, guiltFreeSpending, food\n30, groceries, 01/02/2026, fixedCosts, groceries"}
                    rows={8}
                    className="mt-1 w-full px-4 py-2 border-0 bg-gray-50 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white font-mono text-sm"
                  />
                </div>
                <Button type="submit" disabled={submittingBulk}>
                  {submittingBulk ? "Adding…" : "Add all"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Recurring expenses section */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Repeat className="h-5 w-5" />
                  Recurring Expenses
                </CardTitle>
                <CardDescription>
                  Add templates for repeat expenses. Use &quot;Log now&quot; to create an expense for today.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowRecurringForm(!showRecurringForm)
                  setMessage(null)
                  if (accounts.length && !recurringAccountId) {
                    setRecurringAccountId(accounts.find((a) => a.isDefault)?.id || accounts[0].id)
                  }
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                {showRecurringForm ? "Cancel" : "Add Recurring"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showRecurringForm && (
              <form onSubmit={handleAddRecurring} className="mb-6 p-4 rounded-lg bg-gray-50 space-y-4">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div>
                    <Label>Account *</Label>
                    <select
                      value={recurringAccountId}
                      onChange={(e) => setRecurringAccountId(e.target.value)}
                      required
                      className="mt-1 w-full px-4 py-2 border-0 bg-white rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.bankName})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Amount ($) *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={recurringAmount}
                      onChange={(e) => setRecurringAmount(e.target.value)}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Frequency *</Label>
                    <select
                      value={recurringFrequency}
                      onChange={(e) => setRecurringFrequency(e.target.value)}
                      className="mt-1 w-full px-4 py-2 border-0 bg-white rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      {FREQUENCIES.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Start date</Label>
                    <Input type="date" value={recurringStartDate} onChange={(e) => setRecurringStartDate(e.target.value)} className="mt-1" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Description (optional)</Label>
                    <Input
                      value={recurringDescription}
                      onChange={(e) => setRecurringDescription(e.target.value)}
                      placeholder="e.g. Rent, Netflix"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Fund category</Label>
                    <select
                      value={recurringFundCategory}
                      onChange={(e) => setRecurringFundCategory(e.target.value)}
                      className="mt-1 w-full px-4 py-2 border-0 bg-white rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">—</option>
                      {FUND_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Expense category</Label>
                    <select
                      value={recurringExpenseCategory}
                      onChange={(e) => setRecurringExpenseCategory(e.target.value)}
                      className="mt-1 w-full px-4 py-2 border-0 bg-white rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">—</option>
                      {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>End date (optional)</Label>
                    <Input type="date" value={recurringEndDate} onChange={(e) => setRecurringEndDate(e.target.value)} className="mt-1" />
                  </div>
                </div>
                <Button type="submit" disabled={submittingRecurring} size="sm">
                  {submittingRecurring ? "Adding…" : "Add Recurring Expense"}
                </Button>
              </form>
            )}
            {loadingRecurring ? (
              <div className="py-4 text-center text-gray-500 text-sm">Loading…</div>
            ) : recurring.length === 0 ? (
              <p className="text-sm text-gray-500">No recurring expenses. Click &quot;Add Recurring&quot; to create one.</p>
            ) : (
              <ul className="space-y-2">
                {recurring.map((r) => (
                  <li
                    key={r.id}
                    className={`flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border ${r.isActive ? "bg-white border-gray-200" : "bg-gray-50 border-gray-100"}`}
                  >
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="font-semibold text-gray-900">{formatCurrency(r.amount)}</span>
                      <span className="text-xs text-gray-500 capitalize">{r.frequency}</span>
                      {r.description && <span className="text-sm text-gray-600 truncate">{r.description}</span>}
                      <span className="text-xs text-gray-400">{r.account.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleLogRecurring(r.id)}
                        disabled={loggingRecurringId !== null}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        {loggingRecurringId === r.id ? "Logging…" : "Log now"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteRecurring(r.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

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
              {expensesTotal === 0
                ? "No expenses logged yet"
                : `Showing ${(expensesPage - 1) * expensesLimit + 1}–${Math.min(expensesPage * expensesLimit, expensesTotal)} of ${expensesTotal} expense${expensesTotal !== 1 ? "s" : ""}`}
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
              <>
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
                {expensesTotal > expensesLimit && (
                  <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-500">
                      Page {expensesPage} of {Math.ceil(expensesTotal / expensesLimit)}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={expensesPage <= 1}
                        onClick={() => fetchExpenses(expensesPage - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={expensesPage >= Math.ceil(expensesTotal / expensesLimit)}
                        onClick={() => fetchExpenses(expensesPage + 1)}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
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

        <ConfirmDialog
          open={showRecurringDeleteConfirm}
          onOpenChange={setShowRecurringDeleteConfirm}
          title="Delete recurring expense?"
          description="This only removes the template. Past logged expenses are not affected."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDeleteRecurring}
          variant="destructive"
        />
      </div>
    </>
  )
}
