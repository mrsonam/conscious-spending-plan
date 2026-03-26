"use client"

import { useCallback, useEffect, useState } from "react"
import {
  EXPENSE_CATEGORIES,
  FUND_CATEGORIES,
} from "@/lib/expense-page-constants"
import type {
  ExpenseEntry,
  ExpenseMessage,
  ExpensePageAccount,
  ExpensePageStats,
  RecurringExpense,
} from "@/lib/expense-page-types"

const EXPENSES_LIMIT = 10

export function useExpensePage(
  status: string,
  router: { push: (path: string) => void },
) {
  const [accounts, setAccounts] = useState<ExpensePageAccount[]>([])
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([])
  const [expensesTotal, setExpensesTotal] = useState(0)
  const [expensesPage, setExpensesPage] = useState(1)
  const [expenseStats, setExpenseStats] = useState<ExpensePageStats>({
    currentMonthTotal: 0,
    ytdTotal: 0,
    monthOverMonthPct: null,
    lastMonthExpenses: 0,
    fundBreakdownCurrentMonth: {
      fixedCosts: 0,
      investment: 0,
      savings: 0,
      guiltFreeSpending: 0,
    },
  })
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loadingExpenses, setLoadingExpenses] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [message, setMessage] = useState<ExpenseMessage>(null)

  const [accountId, setAccountId] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [fundCategory, setFundCategory] = useState("")
  const [expenseCategory, setExpenseCategory] = useState("")
  const [date, setDate] = useState(() =>
    new Date().toISOString().split("T")[0],
  )
  const [submitting, setSubmitting] = useState(false)

  const [filterStartDate, setFilterStartDate] = useState("")
  const [filterEndDate, setFilterEndDate] = useState("")
  const [filterFundCategory, setFilterFundCategory] = useState("")
  const [filterExpenseCategory, setFilterExpenseCategory] = useState("")
  const [filterAccountId, setFilterAccountId] = useState("")

  const [recurring, setRecurring] = useState<RecurringExpense[]>([])
  const [loadingRecurring, setLoadingRecurring] = useState(false)
  const [showRecurringForm, setShowRecurringForm] = useState(false)
  const [loggingRecurringId, setLoggingRecurringId] = useState<string | null>(
    null,
  )
  const [recurringDeleteId, setRecurringDeleteId] = useState<string | null>(null)
  const [showRecurringDeleteConfirm, setShowRecurringDeleteConfirm] =
    useState(false)
  const [recurringAccountId, setRecurringAccountId] = useState("")
  const [recurringAmount, setRecurringAmount] = useState("")
  const [recurringDescription, setRecurringDescription] = useState("")
  const [recurringFundCategory, setRecurringFundCategory] = useState("")
  const [recurringExpenseCategory, setRecurringExpenseCategory] = useState("")
  const [recurringFrequency, setRecurringFrequency] = useState("monthly")
  const [recurringStartDate, setRecurringStartDate] = useState(() =>
    new Date().toISOString().split("T")[0],
  )
  const [recurringEndDate, setRecurringEndDate] = useState("")
  const [submittingRecurring, setSubmittingRecurring] = useState(false)

  const [showBulkForm, setShowBulkForm] = useState(false)
  const [bulkText, setBulkText] = useState("")
  const [bulkFundCategory, setBulkFundCategory] = useState("")
  const [bulkExpenseCategory, setBulkExpenseCategory] = useState("")
  const [bulkAccountId, setBulkAccountId] = useState("")
  const [submittingBulk, setSubmittingBulk] = useState(false)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null)

  const applyExpenseListPayload = useCallback((data: Record<string, unknown>) => {
    setExpenses((data.expenses as ExpenseEntry[]) || [])
    setExpensesTotal((data.total as number) ?? 0)
    setExpensesPage((data.page as number) ?? 1)
    if ("currentMonthTotal" in data) {
      setExpenseStats({
        currentMonthTotal: (data.currentMonthTotal as number) ?? 0,
        ytdTotal: (data.ytdTotal as number) ?? 0,
        monthOverMonthPct:
          data.monthOverMonthPct === null ||
          data.monthOverMonthPct === undefined
            ? null
            : (data.monthOverMonthPct as number),
        lastMonthExpenses: (data.lastMonthExpenses as number) ?? 0,
        fundBreakdownCurrentMonth:
          (data.fundBreakdownCurrentMonth as ExpensePageStats["fundBreakdownCurrentMonth"]) ??
          {
            fixedCosts: 0,
            investment: 0,
            savings: 0,
            guiltFreeSpending: 0,
          },
      })
    }
  }, [])

  const fetchAccounts = useCallback(async () => {
    setLoadingAccounts(true)
    try {
      const response = await fetch("/api/accounts")
      if (response.ok) {
        const data = await response.json()
        const list = (data.accounts || []) as ExpensePageAccount[]
        setAccounts(list)
        if (list.length > 0) {
          const defaultAccount = list.find((acc) => acc.isDefault)
          setAccountId((prev) => prev || defaultAccount?.id || list[0].id)
        }
      }
    } catch (error) {
      console.error("Error fetching accounts:", error)
    } finally {
      setLoadingAccounts(false)
    }
  }, [])

  const fetchExpenses = useCallback(
    async (page: number = 1) => {
      setLoadingExpenses(true)
      try {
        const params = new URLSearchParams()
        if (filterStartDate) params.append("startDate", filterStartDate)
        if (filterEndDate) params.append("endDate", filterEndDate)
        if (filterFundCategory) params.append("category", filterFundCategory)
        if (filterExpenseCategory)
          params.append("expenseCategory", filterExpenseCategory)
        if (filterAccountId) params.append("accountId", filterAccountId)
        params.set("page", String(page))
        params.set("limit", String(EXPENSES_LIMIT))

        const response = await fetch(`/api/expenses?${params.toString()}`)
        if (response.ok) {
          const data = (await response.json()) as Record<string, unknown>
          applyExpenseListPayload(data)
        }
      } catch (error) {
        console.error("Error fetching expenses:", error)
      } finally {
        setLoadingExpenses(false)
      }
    },
    [
      filterStartDate,
      filterEndDate,
      filterFundCategory,
      filterExpenseCategory,
      filterAccountId,
      applyExpenseListPayload,
    ],
  )

  const fetchRecurring = useCallback(async () => {
    setLoadingRecurring(true)
    try {
      const res = await fetch("/api/recurring-expenses")
      if (res.ok) {
        const data = await res.json()
        setRecurring((data.recurring || []) as RecurringExpense[])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingRecurring(false)
    }
  }, [])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated") {
      const init = async () => {
        try {
          await fetch("/api/recurring-expenses/process-due", {
            method: "POST",
          })
        } catch (error) {
          console.error("Error auto-logging recurring expenses:", error)
        } finally {
          void fetchAccounts()
          void fetchExpenses(1)
          void fetchRecurring()
        }
      }
      void init()
    }
  }, [status, router, fetchAccounts, fetchExpenses, fetchRecurring])

  useEffect(() => {
    if (status === "authenticated") {
      setExpensesPage(1)
      void fetchExpenses(1)
    }
  }, [
    filterStartDate,
    filterEndDate,
    filterFundCategory,
    filterExpenseCategory,
    filterAccountId,
    status,
    fetchExpenses,
  ])

  const handleAddRecurring = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    const amountNum = parseFloat(recurringAmount)
    if (
      !recurringAccountId ||
      !recurringAmount ||
      isNaN(amountNum) ||
      amountNum <= 0
    ) {
      setMessage({
        type: "error",
        text: "Account and a positive amount are required.",
      })
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
        void fetchRecurring()
      } else {
        setMessage({
          type: "error",
          text: data.error || "Failed to add recurring expense.",
        })
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
        void fetchAccounts()
        void fetchExpenses(1)
      } else {
        setMessage({
          type: "error",
          text: data.error || "Failed to log expense.",
        })
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
      const res = await fetch(`/api/recurring-expenses/${recurringDeleteId}`, {
        method: "DELETE",
      })
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

  const handleSubmit = async (e: React.FormEvent): Promise<boolean> => {
    e.preventDefault()
    setMessage(null)

    if (!accountId || !amount || !date) {
      setMessage({ type: "error", text: "Please fill in all required fields" })
      return false
    }

    const selectedAccount = accounts.find((acc) => acc.id === accountId)
    const isCashAccount = selectedAccount?.accountType === "cash"

    if (!isCashAccount && !fundCategory) {
      setMessage({ type: "error", text: "Please select a fund category" })
      return false
    }

    const amountNum = parseFloat(amount)
    if (amountNum <= 0) {
      setMessage({ type: "error", text: "Amount must be greater than 0" })
      return false
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
        void fetchExpenses(1)
        void fetchAccounts()
        return true
      }
      setMessage({ type: "error", text: data.error || "Failed to log expense" })
      return false
    } catch {
      setMessage({ type: "error", text: "An error occurred" })
      return false
    } finally {
      setSubmitting(false)
    }
  }

  const resolveFundCategory = (raw: string | undefined): string | null => {
    if (!raw || !raw.trim()) return null
    const s = raw.trim()
    const byValue = FUND_CATEGORIES.find((c) => c.value === s)
    if (byValue) return byValue.value
    const byLabel = FUND_CATEGORIES.find(
      (c) => c.label.toLowerCase() === s.toLowerCase(),
    )
    return byLabel ? byLabel.value : null
  }

  const resolveExpenseCategory = (raw: string | undefined): string | null => {
    if (!raw || !raw.trim()) return null
    const s = raw.trim()
    const byValue = EXPENSE_CATEGORIES.find((c) => c.value === s)
    if (byValue) return byValue.value
    const byLabel = EXPENSE_CATEGORIES.find(
      (c) => c.label.toLowerCase() === s.toLowerCase(),
    )
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

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    const today = new Date().toISOString().split("T")[0]

    const lines = bulkText
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (lines.length === 0) {
      setMessage({
        type: "error",
        text: "Paste at least one line. Columns: date, amount, description, fund category, expense category (last 3 optional).",
      })
      return
    }
    const selectedAccount = accounts.find((a) => a.id === (bulkAccountId || undefined))
    const isCashAccount = selectedAccount?.accountType === "cash"

    const rows = lines.map((line) => {
      const parts = line.split(/[\t,]/).map((p) => p.trim())
      const dateRaw = parts[0]
      const amt = parseFloat(parts[1])
      const desc = parts[2] || null
      const part3 = parts[3]
      const part4 = parts[4]
      const parsedDate = parseBulkDate(dateRaw)
      const rowDate = parsedDate ?? today
      const fundFromRow = resolveFundCategory(part3)
      const expenseFromRow = resolveExpenseCategory(part4)
      const category = (fundFromRow ?? bulkFundCategory) || null
      const expCat = (expenseFromRow ?? bulkExpenseCategory) || null
      return {
        amount: Number.isFinite(amt) ? amt : 0,
        description: desc,
        category,
        expenseCategory: expCat,
        date: rowDate,
      }
    })

    const invalidAmount = rows.filter((r) => r.amount <= 0)
    if (invalidAmount.length > 0) {
      setMessage({
        type: "error",
        text: "Every line must start with a valid positive number (amount).",
      })
      return
    }
    if (!isCashAccount) {
      const missingFund = rows.filter((r) => !r.category)
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
          expenses: rows,
        }),
      })
      const data = await response.json()
      if (response.ok) {
        setMessage({
          type: "success",
          text: `${data.created} expense(s) added. Total: $${(data.total ?? 0).toFixed(2)}`,
        })
        setBulkText("")
        setShowBulkForm(false)
        void fetchExpenses(1)
        void fetchAccounts()
      } else {
        setMessage({ type: "error", text: data.error || "Bulk add failed" })
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred" })
    } finally {
      setSubmittingBulk(false)
    }
  }

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
        const nextPage =
          expenses.length <= 1 && expensesPage > 1
            ? expensesPage - 1
            : expensesPage
        void fetchExpenses(nextPage)
        void fetchAccounts()
      } else {
        const data = await response.json()
        setMessage({
          type: "error",
          text: data.error || "Failed to delete expense",
        })
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred" })
    } finally {
      setExpenseToDelete(null)
      setShowDeleteConfirm(false)
    }
  }

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(n)

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })

  return {
    accounts,
    expenses,
    expensesTotal,
    expensesPage,
    expensesLimit: EXPENSES_LIMIT,
    expenseStats,
    loadingAccounts,
    loadingExpenses,
    showAddForm,
    setShowAddForm,
    message,
    setMessage,
    accountId,
    setAccountId,
    amount,
    setAmount,
    description,
    setDescription,
    fundCategory,
    setFundCategory,
    expenseCategory,
    setExpenseCategory,
    date,
    setDate,
    submitting,
    filterStartDate,
    setFilterStartDate,
    filterEndDate,
    setFilterEndDate,
    filterFundCategory,
    setFilterFundCategory,
    filterExpenseCategory,
    setFilterExpenseCategory,
    filterAccountId,
    setFilterAccountId,
    recurring,
    loadingRecurring,
    showRecurringForm,
    setShowRecurringForm,
    loggingRecurringId,
    recurringDeleteId,
    showRecurringDeleteConfirm,
    setShowRecurringDeleteConfirm,
    recurringAccountId,
    setRecurringAccountId,
    recurringAmount,
    setRecurringAmount,
    recurringDescription,
    setRecurringDescription,
    recurringFundCategory,
    setRecurringFundCategory,
    recurringExpenseCategory,
    setRecurringExpenseCategory,
    recurringFrequency,
    setRecurringFrequency,
    recurringStartDate,
    setRecurringStartDate,
    recurringEndDate,
    setRecurringEndDate,
    submittingRecurring,
    showBulkForm,
    setShowBulkForm,
    bulkText,
    setBulkText,
    bulkFundCategory,
    setBulkFundCategory,
    bulkExpenseCategory,
    setBulkExpenseCategory,
    bulkAccountId,
    setBulkAccountId,
    submittingBulk,
    showDeleteConfirm,
    setShowDeleteConfirm,
    expenseToDelete,
    fetchAccounts,
    fetchExpenses,
    fetchRecurring,
    handleAddRecurring,
    handleLogRecurring,
    handleDeleteRecurring,
    confirmDeleteRecurring,
    handleSubmit,
    handleBulkSubmit,
    handleDelete,
    confirmDelete,
    formatCurrency,
    formatDate,
  }
}

export type UseExpensePageResult = ReturnType<typeof useExpensePage>
