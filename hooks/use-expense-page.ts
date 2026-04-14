"use client"

import { useCallback, useEffect, useState } from "react"
import {
  EXPENSE_CATEGORIES,
  FUND_CATEGORIES,
} from "@/lib/expense-page-constants"
import {
  fetchJsonAndCache,
  invalidateCachedJson,
  invalidateCategoryTrackingAndDashboardCaches,
  peekCachedJson,
} from "@/lib/client-fetch-cache"
import type {
  ExpenseEntry,
  ExpenseMessage,
  ExpensePageAccount,
  ExpensePageStats,
  RecurringExpense,
} from "@/lib/expense-page-types"
import { CONSOLE_TABLE_PAGE_SIZE } from "@/lib/wealth-console-tokens"

const EMPTY_EXPENSE_STATS: ExpensePageStats = {
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
  subcategoryInsights: {
    totalClassified: 0,
    unclassifiedAmount: 0,
    topSharePct: 0,
    topThreeSharePct: 0,
    averageEntryAmount: 0,
    topCategories: [],
  },
}

export function useExpensePage(
  status: string,
  router: { push: (path: string) => void },
) {
  const [accounts, setAccounts] = useState<ExpensePageAccount[]>([])
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([])
  const [expensesTotal, setExpensesTotal] = useState(0)
  const [expensesPage, setExpensesPage] = useState(1)
  const [expenseStats, setExpenseStats] = useState<ExpensePageStats>(EMPTY_EXPENSE_STATS)
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [loadingExpenses, setLoadingExpenses] = useState(false)
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
  const [hasLoadedExpenses, setHasLoadedExpenses] = useState(false)
  const [hasLoadedRecurring, setHasLoadedRecurring] = useState(false)
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
        subcategoryInsights:
          (data.subcategoryInsights as ExpensePageStats["subcategoryInsights"]) ??
          {
            totalClassified: 0,
            unclassifiedAmount: 0,
            topSharePct: 0,
            topThreeSharePct: 0,
            averageEntryAmount: 0,
            topCategories: [],
          },
      })
    }
  }, [])

  const fetchAccounts = useCallback(async (force = false) => {
    const cacheKey = "accounts"
    const cached = !force
      ? peekCachedJson<{ accounts: ExpensePageAccount[] }>(cacheKey, 60_000)
      : undefined

    if (cached) {
      const list = cached.accounts || []
      setAccounts(list)
      if (list.length > 0) {
        const defaultAccount = list.find((acc) => acc.isDefault)
        setAccountId((prev) => prev || defaultAccount?.id || list[0].id)
      }
      setLoadingAccounts(false)
    } else {
      setLoadingAccounts(true)
    }

    try {
      const data = await fetchJsonAndCache<{ accounts: ExpensePageAccount[] }>(
        cacheKey,
        "/api/accounts",
      )
      const list = (data.accounts || []) as ExpensePageAccount[]
      setAccounts(list)
      if (list.length > 0) {
        const defaultAccount = list.find((acc) => acc.isDefault)
        setAccountId((prev) => prev || defaultAccount?.id || list[0].id)
      }
    } catch (error) {
      console.error("Error fetching accounts:", error)
    } finally {
      setLoadingAccounts(false)
    }
  }, [])

  const fetchExpenseSummary = useCallback(async (force = false) => {
    const cacheKey = "expenses-summary"
    const cached = !force
      ? peekCachedJson<ExpensePageStats>(cacheKey, 45_000)
      : undefined

    if (cached) {
      setExpenseStats(cached)
      setLoadingSummary(false)
    } else {
      setLoadingSummary(true)
    }

    try {
      const data = await fetchJsonAndCache<ExpensePageStats>(
        cacheKey,
        "/api/expenses/summary",
      )
      setExpenseStats(data)
    } catch (error) {
      console.error("Error fetching expense summary:", error)
    } finally {
      setLoadingSummary(false)
    }
  }, [])

  const fetchExpenses = useCallback(
    async (page: number = 1, force = false) => {
      try {
        const params = new URLSearchParams()
        if (filterStartDate) params.append("startDate", filterStartDate)
        if (filterEndDate) params.append("endDate", filterEndDate)
        if (filterFundCategory) params.append("category", filterFundCategory)
        if (filterExpenseCategory)
          params.append("expenseCategory", filterExpenseCategory)
        if (filterAccountId) params.append("accountId", filterAccountId)
        params.set("page", String(page))
        params.set("limit", String(CONSOLE_TABLE_PAGE_SIZE))
        params.set("includeSummary", "false")

        const cacheKey = `expenses:${params.toString()}`
        const cached = !force
          ? peekCachedJson<Record<string, unknown>>(cacheKey, 30_000)
          : undefined

        if (cached) {
          applyExpenseListPayload(cached)
          setHasLoadedExpenses(true)
          setLoadingExpenses(false)
        } else {
          setLoadingExpenses(true)
        }

        const data = await fetchJsonAndCache<Record<string, unknown>>(
          cacheKey,
          `/api/expenses?${params.toString()}`,
        )
        applyExpenseListPayload(data)
        setHasLoadedExpenses(true)
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

  const fetchRecurring = useCallback(async (force = false) => {
    const cacheKey = "recurring-expenses"
    const cached = !force
      ? peekCachedJson<{ recurring: RecurringExpense[] }>(cacheKey, 60_000)
      : undefined

    if (cached) {
      setRecurring((cached.recurring || []) as RecurringExpense[])
      setHasLoadedRecurring(true)
      setLoadingRecurring(false)
    } else {
      setLoadingRecurring(true)
    }

    try {
      const data = await fetchJsonAndCache<{ recurring: RecurringExpense[] }>(
        cacheKey,
        "/api/recurring-expenses",
      )
      setRecurring((data.recurring || []) as RecurringExpense[])
      setHasLoadedRecurring(true)
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
      void fetchAccounts()
      void fetchExpenseSummary()

      const processDue = async () => {
        try {
          await fetch("/api/recurring-expenses/process-due", {
            method: "POST",
          })
          invalidateCachedJson("accounts")
          invalidateCachedJson("expenses-summary")
          invalidateCachedJson("expenses:")
          invalidateCachedJson("recurring-expenses")
          invalidateCategoryTrackingAndDashboardCaches()
          void fetchAccounts(true)
          void fetchExpenseSummary(true)
          if (hasLoadedExpenses) {
            void fetchExpenses(1, true)
          }
          if (hasLoadedRecurring) {
            void fetchRecurring(true)
          }
        } catch (error) {
          console.error("Error auto-logging recurring expenses:", error)
        }
      }
      void processDue()
    }
  }, [
    status,
    router,
    fetchAccounts,
    fetchExpenseSummary,
    fetchExpenses,
    fetchRecurring,
    hasLoadedExpenses,
    hasLoadedRecurring,
  ])

  useEffect(() => {
    if (status === "authenticated" && hasLoadedExpenses) {
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
    hasLoadedExpenses,
    fetchExpenses,
  ])

  const ensureExpensesLoaded = useCallback(async () => {
    if (hasLoadedExpenses) return
    await fetchExpenses(1)
  }, [fetchExpenses, hasLoadedExpenses])

  const ensureRecurringLoaded = useCallback(async () => {
    if (hasLoadedRecurring) return
    await fetchRecurring()
  }, [fetchRecurring, hasLoadedRecurring])

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
        invalidateCachedJson("accounts")
        invalidateCachedJson("expenses-summary")
        invalidateCachedJson("expenses:")
        invalidateCachedJson("recurring-expenses")
        invalidateCategoryTrackingAndDashboardCaches()
        void fetchAccounts(true)
        void fetchExpenseSummary(true)
        if (hasLoadedExpenses) {
          void fetchExpenses(1, true)
        }
        if (hasLoadedRecurring) {
          void fetchRecurring(true)
        }
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
        invalidateCachedJson("recurring-expenses")
        invalidateCachedJson("expenses-summary")
        invalidateCategoryTrackingAndDashboardCaches()
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
        invalidateCachedJson("accounts")
        invalidateCachedJson("expenses-summary")
        invalidateCachedJson("expenses:")
        invalidateCategoryTrackingAndDashboardCaches()
        void fetchExpenseSummary(true)
        void fetchAccounts(true)
        if (hasLoadedExpenses) {
          void fetchExpenses(1, true)
        }
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
        invalidateCachedJson("accounts")
        invalidateCachedJson("expenses-summary")
        invalidateCachedJson("expenses:")
        invalidateCategoryTrackingAndDashboardCaches()
        void fetchExpenseSummary(true)
        void fetchAccounts(true)
        if (hasLoadedExpenses) {
          void fetchExpenses(1, true)
        }
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
        invalidateCachedJson("accounts")
        invalidateCachedJson("expenses-summary")
        invalidateCachedJson("expenses:")
        invalidateCategoryTrackingAndDashboardCaches()
        const nextPage =
          expenses.length <= 1 && expensesPage > 1
            ? expensesPage - 1
            : expensesPage
        void fetchExpenseSummary(true)
        void fetchAccounts(true)
        if (hasLoadedExpenses) {
          void fetchExpenses(nextPage, true)
        }
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
    expensesLimit: CONSOLE_TABLE_PAGE_SIZE,
    expenseStats,
    loadingAccounts,
    loadingSummary,
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
    hasLoadedExpenses,
    hasLoadedRecurring,
    fetchAccounts,
    fetchExpenseSummary,
    fetchExpenses,
    fetchRecurring,
    ensureExpensesLoaded,
    ensureRecurringLoaded,
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
