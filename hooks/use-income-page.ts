"use client"

import { useCallback, useEffect, useState } from "react"
import type {
  FundAllocation,
  IncomeBreakdown,
  IncomeEntry,
  IncomePageAccount,
  IncomePageStats,
} from "@/lib/income-page-types"
import { CONSOLE_TABLE_PAGE_SIZE } from "@/lib/wealth-console-tokens"
import {
  fetchJsonAndCache,
  invalidateCachedJson,
  invalidateCategoryTrackingAndDashboardCaches,
  peekCachedJson,
} from "@/lib/client-fetch-cache"

const EMPTY_INCOME_STATS: IncomePageStats = {
  currentMonthTotal: 0,
  ytdTotal: 0,
  monthOverMonthPct: null,
  lastMonthIncome: 0,
}

export function useIncomePage(
  status: string,
  router: { push: (path: string) => void },
) {
  const [allocation, setAllocation] = useState<FundAllocation | null>(null)
  const [accounts, setAccounts] = useState<IncomePageAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState("")
  const [breakdown, setBreakdown] = useState<IncomeBreakdown | null>(null)
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>([])
  const [sourceEntries, setSourceEntries] = useState<IncomeEntry[]>([])
  const [incomeTotal, setIncomeTotal] = useState(0)
  const [incomePage, setIncomePage] = useState(1)
  const [income, setIncome] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState("")
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState("")
  const [loadingForm, setLoadingForm] = useState(true)
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [loadingSource, setLoadingSource] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false)
  const [allocateToBudget, setAllocateToBudget] = useState(true)
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null)
  const [incomeStats, setIncomeStats] = useState<IncomePageStats>(EMPTY_INCOME_STATS)

  const applyIncomeListPayload = useCallback((data: Record<string, unknown>) => {
    setIncomeEntries((data.entries as IncomeEntry[]) || [])
    setIncomeTotal((data.total as number) ?? 0)
    setIncomePage((data.page as number) ?? 1)
  }, [])

  const applySourceEntriesPayload = useCallback((data: { entries?: IncomeEntry[] }) => {
    setSourceEntries(data.entries ?? [])
  }, [])

  const applyIncomeStats = useCallback((data: Partial<IncomePageStats>) => {
    setIncomeStats({
      currentMonthTotal: data.currentMonthTotal ?? 0,
      ytdTotal: data.ytdTotal ?? 0,
      monthOverMonthPct:
        data.monthOverMonthPct === null || data.monthOverMonthPct === undefined
          ? null
          : data.monthOverMonthPct,
      lastMonthIncome: data.lastMonthIncome ?? 0,
    })
  }, [])

  const applyAccountsPayload = useCallback((data: { accounts?: IncomePageAccount[] }) => {
    const accountsList = data.accounts || []
    setAccounts(accountsList)
    const defaultAccount = accountsList.find(
      (acc: IncomePageAccount) => acc.isDefault,
    )
    if (defaultAccount) {
      setSelectedAccountId(defaultAccount.id)
    } else if (accountsList.length > 0) {
      setSelectedAccountId(accountsList[0].id)
    }
  }, [])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated") {
      setLoadingForm(true)
      setLoadingSummary(true)
      setLoadingSource(true)
      setLoadingHistory(false)
      const today = new Date()
      setDate(today.toISOString().split("T")[0])
      setAllocateToBudget(true)

      const cachedAllocation = peekCachedJson<FundAllocation>(
        "income:allocation",
        60_000,
      )
      const cachedAccounts = peekCachedJson<{ accounts?: IncomePageAccount[] }>(
        "income:accounts",
        60_000,
      )
      const cachedSummary = peekCachedJson<IncomePageStats>(
        "income:summary",
        30_000,
      )
      const cachedSource = peekCachedJson<{ entries?: IncomeEntry[] }>(
        "income:source",
        30_000,
      )
      const cachedHistory = peekCachedJson<Record<string, unknown>>(
        "income:list:page:1",
        30_000,
      )

      if (cachedAllocation) {
        setAllocation(cachedAllocation)
      }
      if (cachedAccounts) {
        applyAccountsPayload(cachedAccounts)
      }
      if (cachedSummary) {
        applyIncomeStats(cachedSummary)
        setLoadingSummary(false)
      }
      if (cachedSource) {
        applySourceEntriesPayload(cachedSource)
        setLoadingSource(false)
      }
      if (cachedHistory) {
        applyIncomeListPayload(cachedHistory)
        setHasLoadedHistory(true)
      }
      if (cachedAllocation && cachedAccounts) {
        setLoadingForm(false)
      }

      const t = Date.now()
      Promise.allSettled([
        fetchJsonAndCache<FundAllocation>(
          "income:allocation",
          `/api/fund-allocation?t=${t}`,
        ),
        fetchJsonAndCache<{ accounts?: IncomePageAccount[] }>(
          "income:accounts",
          `/api/accounts?t=${t}`,
        ),
      ]).then(([allocationResult, accountsResult]) => {
        if (allocationResult.status === "fulfilled") {
          setAllocation(allocationResult.value)
        }
        if (accountsResult.status === "fulfilled") {
          applyAccountsPayload(accountsResult.value)
        }
        setLoadingForm(false)
      })

      fetchJsonAndCache<IncomePageStats>(
        "income:summary",
        `/api/income-entries/summary?t=${t}`,
      )
        .then((data) => {
          applyIncomeStats(data)
        })
        .finally(() => {
          setLoadingSummary(false)
        })

      fetchJsonAndCache<{ entries?: IncomeEntry[] }>(
        "income:source",
        `/api/income-entries?currentMonth=true&t=${t}`,
      )
        .then((data) => {
          applySourceEntriesPayload(data)
        })
        .finally(() => {
          setLoadingSource(false)
        })
    }
  }, [
    status,
    router,
    applyAccountsPayload,
    applyIncomeListPayload,
    applyIncomeStats,
    applySourceEntriesPayload,
  ])

  const fetchIncomeEntries = useCallback(async (page: number = 1) => {
    const cacheKey = `income:list:page:${page}`
    const cached = peekCachedJson<Record<string, unknown>>(cacheKey, 30_000)
    if (cached) {
      applyIncomeListPayload(cached)
      setLoadingHistory(false)
    } else {
      setLoadingHistory(true)
    }

    try {
      const data = await fetchJsonAndCache<Record<string, unknown>>(
        cacheKey,
        `/api/income-entries?page=${page}&limit=${CONSOLE_TABLE_PAGE_SIZE}&includeStats=false&t=${Date.now()}`,
      )
      applyIncomeListPayload(data)
      setHasLoadedHistory(true)
    } catch {
      /* ignore */
    } finally {
      setLoadingHistory(false)
    }
  }, [applyIncomeListPayload])

  const ensureHistoryLoaded = useCallback(async () => {
    if (hasLoadedHistory) return
    await fetchIncomeEntries(1)
  }, [fetchIncomeEntries, hasLoadedHistory])

  const handleSubmit = async (e: React.FormEvent): Promise<boolean> => {
    e.preventDefault()
    setError("")

    if (!allocation) {
      setError("Please configure your fund allocation settings first")
      return false
    }

    const incomeAmount = parseFloat(income)
    if (!incomeAmount || incomeAmount <= 0) {
      setError("Please enter a valid income amount")
      return false
    }

    if (!date) {
      setError("Please select the income date")
      return false
    }

    const d = new Date(date + "T12:00:00")
    const periodStart = new Date(d.getFullYear(), d.getMonth(), 1)
      .toISOString()
      .split("T")[0]
    const periodEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0]

    setCalculating(true)

    try {
      const response = await fetch("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          income: incomeAmount,
          description: description.trim() || null,
          date,
          periodStart,
          periodEnd,
          accountId: selectedAccountId || null,
          allocateToBudget,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setBreakdown(data)
        setIncome("")
        setDescription("")
        const today = new Date()
        setDate(today.toISOString().split("T")[0])
        invalidateCachedJson(/^income:(summary|source|list:page:|accounts)/)
        invalidateCategoryTrackingAndDashboardCaches()
        setLoadingSummary(true)
        setLoadingSource(true)
        try {
          const [summary, source] = await Promise.all([
            fetchJsonAndCache<IncomePageStats>(
              "income:summary",
              `/api/income-entries/summary?t=${Date.now()}`,
            ),
            fetchJsonAndCache<{ entries?: IncomeEntry[] }>(
              "income:source",
              `/api/income-entries?currentMonth=true&t=${Date.now()}`,
            ),
            hasLoadedHistory ? fetchIncomeEntries(incomePage) : Promise.resolve(),
          ])
          applyIncomeStats(summary)
          applySourceEntriesPayload(source)
        } finally {
          setLoadingSummary(false)
          setLoadingSource(false)
        }
        return true
      }
      setError(data.error || "Failed to calculate breakdown")
      return false
    } catch {
      setError("An error occurred. Please try again.")
      return false
    } finally {
      setCalculating(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const handleDeleteEntry = async () => {
    if (!deleteEntryId) return
    try {
      const response = await fetch(`/api/income-entries/${deleteEntryId}`, {
        method: "DELETE",
      })
      if (response.ok) {
        setDeleteEntryId(null)
        invalidateCachedJson(/^income:(summary|source|list:page:)/)
        invalidateCategoryTrackingAndDashboardCaches()
        const newTotal = incomeTotal - 1
        setIncomeTotal(newTotal)
        const totalPages = Math.max(1, Math.ceil(newTotal / CONSOLE_TABLE_PAGE_SIZE))
        const nextPage = incomePage > totalPages ? totalPages : incomePage
        setLoadingSummary(true)
        setLoadingSource(true)
        await Promise.all([
          fetchJsonAndCache<IncomePageStats>(
            "income:summary",
            `/api/income-entries/summary?t=${Date.now()}`,
          ).then((summary) => {
            applyIncomeStats(summary)
          }),
          fetchJsonAndCache<{ entries?: IncomeEntry[] }>(
            "income:source",
            `/api/income-entries?currentMonth=true&t=${Date.now()}`,
          ).then((source) => {
            applySourceEntriesPayload(source)
          }),
          fetchIncomeEntries(
          incomeEntries.length <= 1 && incomePage > 1
            ? incomePage - 1
            : nextPage,
          ),
        ]).finally(() => {
          setLoadingSummary(false)
          setLoadingSource(false)
        })
      }
    } catch {
      /* ignore */
    }
  }

  const clearBreakdown = useCallback(() => {
    setBreakdown(null)
  }, [])

  return {
    allocation,
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    breakdown,
    clearBreakdown,
    incomeStats,
    incomeEntries,
    sourceEntries,
    incomeTotal,
    incomePage,
    incomeLimit: CONSOLE_TABLE_PAGE_SIZE,
    income,
    setIncome,
    description,
    setDescription,
    date,
    setDate,
    calculating,
    error,
    loadingForm,
    loadingSummary,
    loadingSource,
    loadingHistory,
    hasLoadedHistory,
    allocateToBudget,
    setAllocateToBudget,
    deleteEntryId,
    setDeleteEntryId,
    fetchIncomeEntries,
    ensureHistoryLoaded,
    handleSubmit,
    formatDate,
    handleDeleteEntry,
  }
}

export type UseIncomePageResult = ReturnType<typeof useIncomePage>
