"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import {
  EXPENSE_CATEGORIES,
  FUND_CATEGORIES,
} from "@/lib/expense-page-constants"
import {
  fetchJsonAndCache,
  invalidateCachedJson,
  invalidateExpenseDataCaches,
  peekCachedJson,
  withCacheBust,
} from "@/lib/client-fetch-cache"
import type {
  ExpenseEntry,
  ExpenseMessage,
  ExpensePageAccount,
  ExpensePageStats,
  RecurringExpense,
} from "@/lib/expense-page-types"
import { CONSOLE_TABLE_PAGE_SIZE } from "@/lib/wealth-console-tokens"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { parseMoneyInput } from "@/lib/money-input"
import {
  buildFieldErrors,
  hasFieldErrors,
  requireField,
  requirePositiveNumber,
  requireSelection,
} from "@/lib/form-validation"
import { useFormFieldErrors } from "@/hooks/use-form-field-errors"
import {
  applyOptimisticSummaryDelta,
  adjustAccountsForExpenseEdit,
  buildOptimisticExpenseEntry,
  createOptimisticExpenseId,
  expenseMatchesListFilters,
  normalizeExpenseFromApi,
} from "@/lib/expense-optimistic"
import {
  hasProcessedRecurringDueToday,
  markRecurringProcessDueRanToday,
  scheduleWhenIdle,
} from "@/lib/recurring-process-due-schedule"
import { toastLoading, toastSuccess, toastUpdate } from "@/lib/app-toast"

type FetchOptions = { silent?: boolean }

type ExpenseLogSnapshot = {
  accounts: ExpensePageAccount[]
  expenses: ExpenseEntry[]
  expensesTotal: number
  expensesPage: number
  expenseStats: ExpensePageStats
}

export type ExpenseLogFieldKey = "accountId" | "amount" | "date" | "fundCategory"
export type ExpenseRecurringFieldKey =
  | "recurringAccountId"
  | "recurringAmount"
  | "recurringFrequency"
export type ExpenseFieldKey = ExpenseLogFieldKey | ExpenseRecurringFieldKey

const EMPTY_EXPENSE_STATS: ExpensePageStats = {
  currentMonthTotal: 0,
  ytdTotal: 0,
  monthOverMonthPct: null,
  lastMonthExpenses: 0,
  averageMonthlySpending: 0,
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
  const { formatCurrency, currencyCode } = useFormatCurrency()
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
  const [logFormError, setLogFormError] = useState<string | null>(null)
  const [recurringFormError, setRecurringFormError] = useState<string | null>(null)
  const {
    fieldErrors,
    setFieldErrors,
    clearFieldError,
    clearFieldErrors,
  } = useFormFieldErrors<ExpenseFieldKey>()

  const [accountId, setAccountId] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [fundCategory, setFundCategory] = useState("")
  const [expenseCategory, setExpenseCategory] = useState("")
  const [date, setDate] = useState(() =>
    new Date().toISOString().split("T")[0],
  )
  const [submitting, setSubmitting] = useState(false)
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)

  const [filterStartDate, setFilterStartDate] = useState("")
  const [filterEndDate, setFilterEndDate] = useState("")
  const [filterFundCategory, setFilterFundCategory] = useState("")
  const [filterExpenseCategory, setFilterExpenseCategory] = useState("")
  const [filterAccountId, setFilterAccountId] = useState("")

  const [recurring, setRecurring] = useState<RecurringExpense[]>([])
  const [loadingRecurring, setLoadingRecurring] = useState(false)
  const [hasLoadedExpenses, setHasLoadedExpenses] = useState(false)
  const [hasLoadedRecurring, setHasLoadedRecurring] = useState(false)
  const hasLoadedRecurringRef = useRef(false)
  hasLoadedRecurringRef.current = hasLoadedRecurring
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

  const accountsFetchGenRef = useRef(0)
  const summaryFetchGenRef = useRef(0)
  const expensesFetchGenRef = useRef(0)
  const expenseLogInFlightRef = useRef(false)

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
        averageMonthlySpending: (data.averageMonthlySpending as number) ?? 0,
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

  const fetchAccounts = useCallback(async (force = false, options?: FetchOptions) => {
    const silent = options?.silent === true
    const requestGen = ++accountsFetchGenRef.current
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
      if (!silent) setLoadingAccounts(false)
    } else if (!silent) {
      setLoadingAccounts(true)
    }

    try {
      const data = await fetchJsonAndCache<{ accounts: ExpensePageAccount[] }>(
        cacheKey,
        force ? withCacheBust("/api/accounts") : "/api/accounts",
        undefined,
        { force },
      )
      if (requestGen !== accountsFetchGenRef.current) return
      const list = (data.accounts || []) as ExpensePageAccount[]
      setAccounts(list)
      if (list.length > 0) {
        const defaultAccount = list.find((acc) => acc.isDefault)
        setAccountId((prev) => prev || defaultAccount?.id || list[0].id)
      }
    } catch (error) {
      console.error("Error fetching accounts:", error)
    } finally {
      if (!silent && requestGen === accountsFetchGenRef.current) {
        setLoadingAccounts(false)
      }
    }
  }, [])

  const fetchExpenseSummary = useCallback(async (force = false, options?: FetchOptions) => {
    const silent = options?.silent === true
    const requestGen = ++summaryFetchGenRef.current
    const cacheKey = "expenses-summary"
    const cached = !force
      ? peekCachedJson<ExpensePageStats>(cacheKey, 45_000)
      : undefined

    if (cached) {
      setExpenseStats(cached)
      if (!silent) setLoadingSummary(false)
    } else if (!silent) {
      setLoadingSummary(true)
    }

    try {
      const data = await fetchJsonAndCache<ExpensePageStats>(
        cacheKey,
        force ? withCacheBust("/api/expenses/summary") : "/api/expenses/summary",
        undefined,
        { force },
      )
      if (requestGen !== summaryFetchGenRef.current) return
      setExpenseStats(data)
    } catch (error) {
      console.error("Error fetching expense summary:", error)
    } finally {
      if (!silent && requestGen === summaryFetchGenRef.current) {
        setLoadingSummary(false)
      }
    }
  }, [])

  const fetchExpenses = useCallback(
    async (page: number = 1, force = false, options?: FetchOptions) => {
      const silent = options?.silent === true
      const requestGen = ++expensesFetchGenRef.current
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
          if (!silent) setLoadingExpenses(false)
        } else if (!silent) {
          setLoadingExpenses(true)
        }

        const listPath = `/api/expenses?${params.toString()}`
        const data = await fetchJsonAndCache<Record<string, unknown>>(
          cacheKey,
          force ? withCacheBust(listPath) : listPath,
          undefined,
          { force },
        )
        if (requestGen !== expensesFetchGenRef.current) return
        applyExpenseListPayload(data)
        setHasLoadedExpenses(true)
      } catch (error) {
        console.error("Error fetching expenses:", error)
      } finally {
        if (!silent && requestGen === expensesFetchGenRef.current) {
          setLoadingExpenses(false)
        }
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

  const listFilters = useCallback(
    (): {
      startDate: string
      endDate: string
      fundCategory: string
      expenseCategory: string
      accountId: string
    } => ({
      startDate: filterStartDate,
      endDate: filterEndDate,
      fundCategory: filterFundCategory,
      expenseCategory: filterExpenseCategory,
      accountId: filterAccountId,
    }),
    [
      filterStartDate,
      filterEndDate,
      filterFundCategory,
      filterExpenseCategory,
      filterAccountId,
    ],
  )

  const applyOptimisticExpense = useCallback(
    (entry: ExpenseEntry, amountDeducted: number) => {
      setAccounts((prev) =>
        prev.map((account) =>
          account.id === entry.accountId
            ? { ...account, balance: account.balance - amountDeducted }
            : account,
        ),
      )

      if (expenseMatchesListFilters(entry, listFilters())) {
        setHasLoadedExpenses(true)
        setExpensesPage(1)
        setExpenses((prev) => {
          if (prev.some((row) => row.id === entry.id)) return prev
          return [entry, ...prev]
        })
        setExpensesTotal((total) => total + 1)
      }

      setExpenseStats((prev) => applyOptimisticSummaryDelta(prev, entry))
    },
    [listFilters],
  )

  const rollbackExpenseLog = useCallback((snapshot: ExpenseLogSnapshot) => {
    setAccounts(snapshot.accounts)
    setExpenses(snapshot.expenses)
    setExpensesTotal(snapshot.expensesTotal)
    setExpensesPage(snapshot.expensesPage)
    setExpenseStats(snapshot.expenseStats)
  }, [])

  const reconcileExpenseData = useCallback(
    async (opts?: { page?: number; silent?: boolean }) => {
      invalidateExpenseDataCaches()
      const page = opts?.page ?? 1
      if (page !== expensesPage) {
        setExpensesPage(page)
      }
      const fetchOpts = { silent: opts?.silent }
      await Promise.all([
        fetchExpenseSummary(true, fetchOpts),
        fetchAccounts(true, fetchOpts),
        fetchExpenses(page, true, fetchOpts),
      ])
    },
    [expensesPage, fetchExpenseSummary, fetchAccounts, fetchExpenses],
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

  useLayoutEffect(() => {
    if (status !== "authenticated") return

    const cachedAccounts =
      peekCachedJson<{ accounts: ExpensePageAccount[] }>("accounts", 60_000) ??
      peekCachedJson<{ accounts?: ExpensePageAccount[] }>("dashboard:accounts", 45_000)
    if (cachedAccounts) {
      const list = cachedAccounts.accounts || []
      setAccounts(list)
      if (list.length > 0) {
        const defaultAccount = list.find((acc) => acc.isDefault)
        setAccountId((prev) => prev || defaultAccount?.id || list[0].id)
      }
      setLoadingAccounts(false)
    }

    const cachedSummary = peekCachedJson<ExpensePageStats>("expenses-summary", 45_000)
    if (cachedSummary) {
      setExpenseStats(cachedSummary)
      setLoadingSummary(false)
    }
  }, [status])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated") {
      void fetchAccounts()
      void fetchExpenseSummary()
    }
  }, [status, router, fetchAccounts, fetchExpenseSummary])

  /** At most once per local calendar day; deferred until idle so Expenses UI paints first. */
  useEffect(() => {
    if (status !== "authenticated") return
    if (hasProcessedRecurringDueToday()) return

    const cancel = scheduleWhenIdle(async () => {
      if (hasProcessedRecurringDueToday()) return

      try {
        const response = await fetch("/api/recurring-expenses/process-due", {
          method: "POST",
          credentials: "same-origin",
        })
        if (!response.ok) return

        markRecurringProcessDueRanToday()
        invalidateCachedJson("recurring-expenses")
        await reconcileExpenseData({ silent: true })
        if (hasLoadedRecurringRef.current) {
          await fetchRecurring(true)
        }
      } catch (error) {
        console.error("Error auto-logging recurring expenses:", error)
      }
    })

    return cancel
  }, [status, reconcileExpenseData, fetchRecurring])

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
    setRecurringFormError(null)
    const recurringErrors = buildFieldErrors<ExpenseRecurringFieldKey>([
      ["recurringAccountId", requireSelection(recurringAccountId, "an account")],
      ["recurringAmount", requirePositiveNumber(recurringAmount, "Amount")],
      ["recurringFrequency", requireSelection(recurringFrequency, "a frequency")],
    ])
    if (hasFieldErrors(recurringErrors)) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next.recurringAccountId
        delete next.recurringAmount
        delete next.recurringFrequency
        return { ...next, ...recurringErrors }
      })
      return
    }
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next.recurringAccountId
      delete next.recurringAmount
      delete next.recurringFrequency
      return next
    })
    const amountNum = parseMoneyInput(recurringAmount, currencyCode)
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
        toastSuccess("Recurring expense added.")
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
        setRecurringFormError(
          data.error || "Failed to add recurring expense.",
        )
      }
    } catch {
      setRecurringFormError("An error occurred.")
    } finally {
      setSubmittingRecurring(false)
    }
  }

  const handleLogRecurring = async (id: string) => {
    const source = recurring.find((item) => item.id === id)
    if (!source) return

    const logDate = new Date().toISOString().split("T")[0]!
    const optimisticId = createOptimisticExpenseId()
    const optimisticEntry = buildOptimisticExpenseEntry({
      id: optimisticId,
      accountId: source.accountId,
      amount: source.amount,
      description: source.description,
      category: source.category,
      expenseCategory: source.expenseCategory,
      date: logDate,
      account: source.account,
    })

    const snapshot: ExpenseLogSnapshot = {
      accounts,
      expenses,
      expensesTotal,
      expensesPage,
      expenseStats,
    }

    applyOptimisticExpense(optimisticEntry, source.amount)
    toastSuccess("Expense logged for today.")
    setLoggingRecurringId(id)

    void (async () => {
      try {
        const res = await fetch(`/api/recurring-expenses/${id}/log`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: logDate }),
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || "Failed to log expense.")
        }

        const created = normalizeExpenseFromApi(data.expense as ExpenseEntry)
        setExpenses((prev) =>
          prev.map((row) => (row.id === optimisticId ? created : row)),
        )

        invalidateCachedJson("recurring-expenses")
        if (hasLoadedRecurring) {
          await fetchRecurring(true)
        }
        await reconcileExpenseData({ silent: true })
      } catch (error) {
        rollbackExpenseLog(snapshot)
        setMessage({
          type: "error",
          text:
            error instanceof Error ? error.message : "Failed to log expense.",
        })
      } finally {
        setLoggingRecurringId(null)
      }
    })()
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
        toastSuccess("Recurring expense removed.")
        setRecurring((prev) => prev.filter((r) => r.id !== recurringDeleteId))
        invalidateCachedJson("recurring-expenses")
        invalidateExpenseDataCaches()
        await fetchExpenseSummary(true)
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

  const resetLogForm = useCallback(() => {
    setEditingExpenseId(null)
    setLogFormError(null)
    clearFieldErrors()
    setAmount("")
    setDescription("")
    setFundCategory("")
    setExpenseCategory("")
    setDate(new Date().toISOString().split("T")[0]!)
    if (accounts.length > 0) {
      const defaultAccount = accounts.find((acc) => acc.isDefault)
      setAccountId(defaultAccount?.id || accounts[0]!.id)
    }
  }, [accounts, clearFieldErrors])

  const startEditExpense = useCallback((expense: ExpenseEntry) => {
    setEditingExpenseId(expense.id)
    setLogFormError(null)
    clearFieldErrors()
    setAccountId(expense.accountId)
    setAmount(String(expense.amount))
    setDescription(expense.description ?? "")
    setFundCategory(expense.category ?? "")
    setExpenseCategory(expense.expenseCategory ?? "")
    setDate(expense.date.slice(0, 10))
  }, [clearFieldErrors])

  const handleSubmit = async (e: React.FormEvent): Promise<boolean> => {
    e.preventDefault()
    setLogFormError(null)

    const selectedAccount = accounts.find((acc) => acc.id === accountId)
    const isCashAccount = selectedAccount?.accountType === "cash"

    const logErrors = buildFieldErrors<ExpenseLogFieldKey>([
      ["accountId", requireSelection(accountId, "an account")],
      ["amount", requirePositiveNumber(amount, "Amount")],
      ["date", requireField(date, "Date")],
      [
        "fundCategory",
        !isCashAccount && !fundCategory
          ? "Please select a fund category."
          : null,
      ],
    ])
    if (hasFieldErrors(logErrors)) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next.accountId
        delete next.amount
        delete next.date
        delete next.fundCategory
        return { ...next, ...logErrors }
      })
      return false
    }
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next.accountId
      delete next.amount
      delete next.date
      delete next.fundCategory
      return next
    })

    const amountNum = parseMoneyInput(amount, currencyCode)
    if (!selectedAccount) return false
    if (expenseLogInFlightRef.current) return false

    const snapshot: ExpenseLogSnapshot = {
      accounts,
      expenses,
      expensesTotal,
      expensesPage,
      expenseStats,
    }

    const payload = {
      accountId,
      amount: amountNum,
      description: description || null,
      category: fundCategory || null,
      expenseCategory: expenseCategory || null,
      date,
    }

    expenseLogInFlightRef.current = true

    if (editingExpenseId) {
      const expenseId = editingExpenseId
      const existing = expenses.find((entry) => entry.id === expenseId)
      if (!existing) {
        expenseLogInFlightRef.current = false
        setLogFormError("Expense not found. Refresh and try again.")
        return false
      }

      const updatedEntry = buildOptimisticExpenseEntry({
        id: expenseId,
        accountId,
        amount: amountNum,
        description: description || null,
        category: fundCategory || null,
        expenseCategory: expenseCategory || null,
        date,
        account: {
          id: selectedAccount.id,
          name: selectedAccount.name,
          bankName: selectedAccount.bankName,
        },
      })

      setAccounts((prev) =>
        adjustAccountsForExpenseEdit(prev, existing, updatedEntry),
      )
      setExpenses((prev) => {
        const next = prev.map((row) =>
          row.id === expenseId ? updatedEntry : row,
        )
        return next.filter(
          (row) =>
            row.id !== expenseId ||
            expenseMatchesListFilters(row, listFilters()),
        )
      })

      toastSuccess("Expense updated.")

      void (async () => {
        try {
          const response = await fetch(
            `/api/expenses?id=${encodeURIComponent(expenseId)}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            },
          )
          const data = await response.json()
          if (!response.ok) {
            throw new Error(data.error || "Failed to update expense")
          }

          const saved = normalizeExpenseFromApi(data.expense as ExpenseEntry)
          setExpenses((prev) => {
            const next = prev.map((row) =>
              row.id === expenseId ? saved : row,
            )
            return next.filter(
              (row) =>
                row.id !== expenseId ||
                expenseMatchesListFilters(row, listFilters()),
            )
          })

          await reconcileExpenseData({ silent: true })
        } catch (error) {
          rollbackExpenseLog(snapshot)
          setMessage({
            type: "error",
            text:
              error instanceof Error ? error.message : "Failed to update expense",
          })
          setLogFormError(
            error instanceof Error ? error.message : "Failed to update expense",
          )
        } finally {
          expenseLogInFlightRef.current = false
        }
      })()

      return true
    }

    const optimisticId = createOptimisticExpenseId()
    const optimisticEntry = buildOptimisticExpenseEntry({
      id: optimisticId,
      accountId,
      amount: amountNum,
      description: description || null,
      category: fundCategory || null,
      expenseCategory: expenseCategory || null,
      date,
      account: {
        id: selectedAccount.id,
        name: selectedAccount.name,
        bankName: selectedAccount.bankName,
      },
    })

    applyOptimisticExpense(optimisticEntry, amountNum)

    toastSuccess("Expense logged successfully!")
    setLogFormError(null)
    clearFieldErrors()
    resetLogForm()
    setShowAddForm(false)

    void (async () => {
      try {
        const response = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || "Failed to log expense")
        }

        const created = normalizeExpenseFromApi(data.expense as ExpenseEntry)
        setExpenses((prev) =>
          prev.map((row) => (row.id === optimisticId ? created : row)),
        )

        await reconcileExpenseData({ silent: true })
      } catch (error) {
        rollbackExpenseLog(snapshot)
        setMessage({
          type: "error",
          text:
            error instanceof Error ? error.message : "Failed to log expense",
        })
        setLogFormError(
          error instanceof Error ? error.message : "Failed to log expense",
        )
      } finally {
        expenseLogInFlightRef.current = false
      }
    })()

    return true
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
      const amt = parseMoneyInput(parts[1], currencyCode)
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

    const bulkPayload = {
      accountId: bulkAccountId || undefined,
      expenses: rows,
    }
    const rowCount = rows.length

    const toastId = toastLoading(`Adding ${rowCount} expense(s)…`)
    setBulkText("")
    setShowBulkForm(false)

    void (async () => {
      setSubmittingBulk(true)
      try {
        const response = await fetch("/api/expenses/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bulkPayload),
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || "Bulk add failed")
        }
        toastUpdate(
          toastId,
          `${data.created} expense(s) added. Total: $${(data.total ?? 0).toFixed(2)}`,
          "success"
        )
        await reconcileExpenseData({ silent: true })
      } catch (error) {
        toastUpdate(
          toastId,
          error instanceof Error ? error.message : "An error occurred",
          "error"
        )
        await reconcileExpenseData({ silent: true })
      } finally {
        setSubmittingBulk(false)
      }
    })()
  }

  const handleDelete = async (expenseId: string) => {
    setExpenseToDelete(expenseId)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!expenseToDelete) return

    const deletedId = expenseToDelete
    const snapshot: ExpenseLogSnapshot = {
      accounts,
      expenses,
      expensesTotal,
      expensesPage,
      expenseStats,
    }
    const nextPage =
      expenses.length <= 1 && expensesPage > 1 ? expensesPage - 1 : expensesPage

    setExpenses((prev) => prev.filter((entry) => entry.id !== deletedId))
    setExpensesTotal((total) => Math.max(0, total - 1))
    toastSuccess("Expense deleted successfully")
    setExpenseToDelete(null)
    setShowDeleteConfirm(false)

    void (async () => {
      try {
        const response = await fetch(`/api/expenses?id=${deletedId}`, {
          method: "DELETE",
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to delete expense")
        }

        await reconcileExpenseData({ page: nextPage, silent: true })
      } catch (error) {
        rollbackExpenseLog(snapshot)
        setMessage({
          type: "error",
          text: error instanceof Error ? error.message : "An error occurred",
        })
      }
    })()
  }

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
    logFormError,
    setLogFormError,
    recurringFormError,
    setRecurringFormError,
    fieldErrors,
    clearFieldError,
    clearFieldErrors,
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
    editingExpenseId,
    resetLogForm,
    startEditExpense,
    handleSubmit,
    handleBulkSubmit,
    handleDelete,
    confirmDelete,
    formatCurrency,
    formatDate,
  }
}

export type UseExpensePageResult = ReturnType<typeof useExpensePage>
