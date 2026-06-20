"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import type {
  FundAllocation,
  IncomeBreakdown,
  IncomeEntry,
  IncomePageAccount,
  IncomePageStats,
} from "@/lib/income-page-types"
import { CONSOLE_TABLE_PAGE_SIZE } from "@/lib/wealth-console-tokens"
import {
  buildFieldErrors,
  hasFieldErrors,
  requireField,
  requirePositiveNumber,
} from "@/lib/form-validation"
import { useFormFieldErrors } from "@/hooks/use-form-field-errors"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { parseMoneyInput } from "@/lib/money-input"
import {
  adjustAccountsForIncomeEdit,
  applyOptimisticIncomeEditSummaryDelta,
  applyOptimisticIncomeSummaryDelta,
  buildOptimisticIncomeEntry,
  computeOptimisticBreakdown,
  createOptimisticIncomeId,
  incomeEntryFromCalculateResponse,
  isInCurrentMonth,
  normalizeIncomeEntryFromApi,
} from "@/lib/income-optimistic"
import { toastLoading, toastSuccess, toastUpdate } from "@/lib/app-toast"
import {
  fetchJsonAndCache,
  invalidateIncomeDataCaches,
  peekCachedJson,
  withCacheBust,
} from "@/lib/client-fetch-cache"

export type IncomeFormFieldKey = "income" | "date"

type FetchOptions = { silent?: boolean }

type IncomeLogSnapshot = {
  allocation: FundAllocation | null
  accounts: IncomePageAccount[]
  breakdown: IncomeBreakdown | null
  incomeStats: IncomePageStats
  sourceEntries: IncomeEntry[]
  incomeEntries: IncomeEntry[]
  incomeTotal: number
  incomePage: number
}

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
  const { currencyCode } = useFormatCurrency()
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
  const {
    fieldErrors,
    setFieldErrors,
    clearFieldError,
    clearFieldErrors,
  } = useFormFieldErrors<IncomeFormFieldKey>()
  const [loadingForm, setLoadingForm] = useState(true)
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [loadingSource, setLoadingSource] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false)
  const [allocateToBudget, setAllocateToBudget] = useState(true)
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [showBulkForm, setShowBulkForm] = useState(false)
  const [bulkText, setBulkText] = useState("")
  const [bulkAccountId, setBulkAccountId] = useState("")
  const [bulkAllocateToBudget, setBulkAllocateToBudget] = useState(true)
  const [submittingBulk, setSubmittingBulk] = useState(false)
  const [incomeStats, setIncomeStats] = useState<IncomePageStats>(EMPTY_INCOME_STATS)

  const summaryFetchGenRef = useRef(0)
  const sourceFetchGenRef = useRef(0)
  const historyFetchGenRef = useRef(0)
  const incomeLogInFlightRef = useRef(false)

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
    setBulkAccountId((prev) => {
      if (prev && accountsList.some((acc) => acc.id === prev)) return prev
      return defaultAccount?.id ?? accountsList[0]?.id ?? ""
    })
  }, [])

  const fetchIncomeSummary = useCallback(
    async (force = false, options?: FetchOptions) => {
      const silent = options?.silent === true
      const requestGen = ++summaryFetchGenRef.current
      const cacheKey = "income:summary"

      if (!force && !silent) {
        const cached = peekCachedJson<IncomePageStats>(cacheKey, 30_000)
        if (cached) {
          applyIncomeStats(cached)
          setLoadingSummary(false)
        } else {
          setLoadingSummary(true)
        }
      } else if (!silent) {
        setLoadingSummary(true)
      }

      try {
        const path = "/api/income-entries/summary"
        const data = await fetchJsonAndCache<IncomePageStats>(
          cacheKey,
          force || silent ? withCacheBust(path) : path,
          undefined,
          { force: force || silent },
        )
        if (requestGen !== summaryFetchGenRef.current) return
        applyIncomeStats(data)
      } catch {
        /* ignore */
      } finally {
        if (!silent && requestGen === summaryFetchGenRef.current) {
          setLoadingSummary(false)
        }
      }
    },
    [applyIncomeStats],
  )

  const fetchIncomeSource = useCallback(
    async (force = false, options?: FetchOptions) => {
      const silent = options?.silent === true
      const requestGen = ++sourceFetchGenRef.current
      const cacheKey = "income:source"

      if (!force && !silent) {
        const cached = peekCachedJson<{ entries?: IncomeEntry[] }>(cacheKey, 30_000)
        if (cached) {
          applySourceEntriesPayload(cached)
          setLoadingSource(false)
        } else {
          setLoadingSource(true)
        }
      } else if (!silent) {
        setLoadingSource(true)
      }

      try {
        const path = "/api/income-entries?currentMonth=true"
        const data = await fetchJsonAndCache<{ entries?: IncomeEntry[] }>(
          cacheKey,
          force || silent ? withCacheBust(path) : path,
          undefined,
          { force: force || silent },
        )
        if (requestGen !== sourceFetchGenRef.current) return
        applySourceEntriesPayload(data)
      } catch {
        /* ignore */
      } finally {
        if (!silent && requestGen === sourceFetchGenRef.current) {
          setLoadingSource(false)
        }
      }
    },
    [applySourceEntriesPayload],
  )

  const fetchIncomeEntries = useCallback(
    async (page: number = 1, force = false, options?: FetchOptions) => {
      const silent = options?.silent === true
      const requestGen = ++historyFetchGenRef.current
      const cacheKey = `income:list:page:${page}`

      if (!force && !silent) {
        const cached = peekCachedJson<Record<string, unknown>>(cacheKey, 30_000)
        if (cached) {
          applyIncomeListPayload(cached)
          setHasLoadedHistory(true)
          setLoadingHistory(false)
        } else {
          setLoadingHistory(true)
        }
      } else if (!silent) {
        setLoadingHistory(true)
      }

      try {
        const path = `/api/income-entries?page=${page}&limit=${CONSOLE_TABLE_PAGE_SIZE}&includeStats=false`
        const data = await fetchJsonAndCache<Record<string, unknown>>(
          cacheKey,
          force || silent ? withCacheBust(path) : path,
          undefined,
          { force: force || silent },
        )
        if (requestGen !== historyFetchGenRef.current) return
        applyIncomeListPayload(data)
        setHasLoadedHistory(true)
      } catch {
        /* ignore */
      } finally {
        if (!silent && requestGen === historyFetchGenRef.current) {
          setLoadingHistory(false)
        }
      }
    },
    [applyIncomeListPayload],
  )

  useLayoutEffect(() => {
    if (status !== "authenticated") return

    const cachedAllocation = peekCachedJson<FundAllocation>(
      "income:allocation",
      60_000,
    )
    const cachedAccounts = peekCachedJson<{ accounts?: IncomePageAccount[] }>(
      "income:accounts",
      60_000,
    )
    const cachedSummary = peekCachedJson<IncomePageStats>("income:summary", 30_000)
    const cachedSource = peekCachedJson<{ entries?: IncomeEntry[] }>(
      "income:source",
      30_000,
    )
    const cachedHistory = peekCachedJson<Record<string, unknown>>(
      "income:list:page:1",
      30_000,
    )

    if (cachedAllocation) setAllocation(cachedAllocation)
    if (cachedAccounts) applyAccountsPayload(cachedAccounts)
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
  }, [
    status,
    applyAccountsPayload,
    applyIncomeListPayload,
    applyIncomeStats,
    applySourceEntriesPayload,
  ])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated") {
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

      if (!cachedAllocation || !cachedAccounts) {
        setLoadingForm(true)
      }
      if (!cachedSummary) setLoadingSummary(true)
      if (!cachedSource) setLoadingSource(true)
      setLoadingHistory(false)

      const today = new Date()
      setDate(today.toISOString().split("T")[0])
      setAllocateToBudget(true)

      Promise.allSettled([
        fetchJsonAndCache<FundAllocation>(
          "income:allocation",
          "/api/fund-allocation",
        ),
        fetchJsonAndCache<{ accounts?: IncomePageAccount[] }>(
          "income:accounts",
          "/api/accounts",
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

      void fetchIncomeSummary(false)
      void fetchIncomeSource(false)
    }
  }, [
    status,
    router,
    applyAccountsPayload,
    applyIncomeListPayload,
    applyIncomeStats,
    applySourceEntriesPayload,
    fetchIncomeSummary,
    fetchIncomeSource,
  ])

  const applyOptimisticIncome = useCallback(
    (
      entry: IncomeEntry,
      breakdown: IncomeBreakdown,
      depositAmount: number,
      account: IncomePageAccount | null,
    ) => {
      setBreakdown(breakdown)
      setIncomeStats((prev) =>
        applyOptimisticIncomeSummaryDelta(prev, depositAmount, entry.date),
      )

      if (isInCurrentMonth(entry.date)) {
        setSourceEntries((prev) => {
          if (prev.some((row) => row.id === entry.id)) return prev
          return [entry, ...prev]
        })
      }

      setHasLoadedHistory(true)
      setIncomePage(1)
      setIncomeEntries((prev) => {
        if (prev.some((row) => row.id === entry.id)) return prev
        return [entry, ...prev]
      })
      setIncomeTotal((total) => total + 1)

      if (account) {
        setAccounts((prev) =>
          prev.map((row) =>
            row.id === account.id
              ? { ...row, balance: row.balance + depositAmount }
              : row,
          ),
        )
      }
    },
    [],
  )

  const rollbackIncomeLog = useCallback((snapshot: IncomeLogSnapshot) => {
    setAllocation(snapshot.allocation)
    setAccounts(snapshot.accounts)
    setBreakdown(snapshot.breakdown)
    setIncomeStats(snapshot.incomeStats)
    setSourceEntries(snapshot.sourceEntries)
    setIncomeEntries(snapshot.incomeEntries)
    setIncomeTotal(snapshot.incomeTotal)
    setIncomePage(snapshot.incomePage)
  }, [])

  const reconcileIncomeData = useCallback(
    async (opts?: { historyPage?: number; silent?: boolean }) => {
      invalidateIncomeDataCaches()
      const page = opts?.historyPage ?? incomePage
      if (page !== incomePage) {
        setIncomePage(page)
      }
      const fetchOpts = { silent: opts?.silent }
      await Promise.all([
        fetchIncomeSummary(true, fetchOpts),
        fetchIncomeSource(true, fetchOpts),
        hasLoadedHistory ? fetchIncomeEntries(page, true, fetchOpts) : Promise.resolve(),
      ])
    },
    [
      incomePage,
      hasLoadedHistory,
      fetchIncomeSummary,
      fetchIncomeSource,
      fetchIncomeEntries,
    ],
  )

  const replaceOptimisticIncomeEntry = useCallback(
    (optimisticId: string, entry: IncomeEntry) => {
      const patch = (rows: IncomeEntry[]) =>
        rows.map((row) => (row.id === optimisticId ? entry : row))

      setSourceEntries(patch)
      setIncomeEntries(patch)
    },
    [],
  )

  const ensureHistoryLoaded = useCallback(async () => {
    if (hasLoadedHistory) return
    await fetchIncomeEntries(1)
  }, [fetchIncomeEntries, hasLoadedHistory])

  const resetLogForm = useCallback(() => {
    setEditingEntryId(null)
    setError("")
    clearFieldErrors()
    setIncome("")
    setDescription("")
    const today = new Date()
    setDate(today.toISOString().split("T")[0]!)
    setAllocateToBudget(true)
    if (accounts.length > 0) {
      const defaultAccount = accounts.find((acc) => acc.isDefault)
      setSelectedAccountId(defaultAccount?.id || accounts[0]!.id)
    }
  }, [accounts, clearFieldErrors])

  const startEditEntry = useCallback(
    (entry: IncomeEntry) => {
      setEditingEntryId(entry.id)
      setError("")
      clearFieldErrors()
      setIncome(String(entry.amount))
      setDescription(entry.description ?? "")
      setDate(entry.date.slice(0, 10))
      setAllocateToBudget(entry.excludeFromAllocation !== true)
      if (entry.account?.id) {
        setSelectedAccountId(entry.account.id)
      }
    },
    [clearFieldErrors],
  )

  const handleSubmit = async (e: React.FormEvent): Promise<boolean> => {
    e.preventDefault()
    setError("")
    clearFieldErrors()

    if (!allocation) {
      setError("Please configure your fund allocation settings first.")
      return false
    }

    const incomeErrors = buildFieldErrors<IncomeFormFieldKey>([
      ["income", requirePositiveNumber(income, "Income")],
      ["date", requireField(date, "Date")],
    ])
    if (hasFieldErrors(incomeErrors)) {
      setFieldErrors(incomeErrors)
      return false
    }

    const incomeAmount = parseMoneyInput(income, currencyCode)
    if (incomeLogInFlightRef.current) return false

    const d = new Date(date + "T12:00:00")
    const periodStart = new Date(d.getFullYear(), d.getMonth(), 1)
      .toISOString()
      .split("T")[0]!
    const periodEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0]!

    const selectedAccount =
      accounts.find((acc) => acc.id === selectedAccountId) ?? null
    const trimmedDescription = description.trim() || null

    const snapshot: IncomeLogSnapshot = {
      allocation,
      accounts,
      breakdown,
      incomeStats,
      sourceEntries,
      incomeEntries,
      incomeTotal,
      incomePage,
    }

    const payload = {
      income: incomeAmount,
      description: trimmedDescription,
      date,
      periodStart,
      periodEnd,
      accountId: selectedAccountId || null,
      allocateToBudget,
    }

    incomeLogInFlightRef.current = true

    if (editingEntryId) {
      const entryId = editingEntryId
      const existing =
        incomeEntries.find((entry) => entry.id === entryId) ??
        sourceEntries.find((entry) => entry.id === entryId)

      if (!existing) {
        incomeLogInFlightRef.current = false
        setError("Income entry not found. Refresh and try again.")
        return false
      }

      const updatedEntry = buildOptimisticIncomeEntry({
        id: entryId,
        amount: incomeAmount,
        description: trimmedDescription,
        date,
        periodStart,
        periodEnd,
        excludeFromAllocation: !allocateToBudget,
        account: selectedAccount
          ? {
              id: selectedAccount.id,
              name: selectedAccount.name,
              bankName: selectedAccount.bankName,
              accountType: selectedAccount.accountType,
            }
          : null,
      })
      const optimisticBreakdown = computeOptimisticBreakdown(
        incomeAmount,
        allocation,
        { allocateToBudget, account: selectedAccount },
      )

      const patchEntry = (rows: IncomeEntry[]) =>
        rows.map((row) => (row.id === entryId ? updatedEntry : row))

      setBreakdown(optimisticBreakdown)
      setIncomeStats((prev) =>
        applyOptimisticIncomeEditSummaryDelta(prev, existing, updatedEntry),
      )
      setSourceEntries((prev) => {
        const next = patchEntry(prev)
        if (isInCurrentMonth(existing.date) && !isInCurrentMonth(date)) {
          return next.filter((row) => row.id !== entryId)
        }
        if (!isInCurrentMonth(existing.date) && isInCurrentMonth(date)) {
          if (next.some((row) => row.id === entryId)) return next
          return [updatedEntry, ...next]
        }
        return next
      })
      setIncomeEntries(patchEntry)
      setAccounts((prev) =>
        adjustAccountsForIncomeEdit(prev, existing, updatedEntry),
      )

      toastSuccess("Income updated.")

      void (async () => {
        try {
          const response = await fetch(
            `/api/income-entries/${encodeURIComponent(entryId)}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            },
          )
          const data = (await response.json()) as {
            entry?: IncomeEntry
            breakdown?: IncomeBreakdown
            error?: string
          }
          if (!response.ok) {
            throw new Error(data.error || "Failed to update income entry")
          }

          if (data.breakdown) {
            setBreakdown(data.breakdown)
          }
          if (data.entry) {
            const saved = normalizeIncomeEntryFromApi(data.entry)
            replaceOptimisticIncomeEntry(entryId, saved)
          }

          await reconcileIncomeData({ silent: true })
        } catch (err) {
          rollbackIncomeLog(snapshot)
          setError(
            err instanceof Error
              ? err.message
              : "An error occurred. Please try again.",
          )
        } finally {
          incomeLogInFlightRef.current = false
        }
      })()

      return true
    }

    const optimisticId = createOptimisticIncomeId()
    const optimisticEntry = buildOptimisticIncomeEntry({
      id: optimisticId,
      amount: incomeAmount,
      description: trimmedDescription,
      date,
      periodStart,
      periodEnd,
      excludeFromAllocation: !allocateToBudget,
      account: selectedAccount
        ? {
            id: selectedAccount.id,
            name: selectedAccount.name,
            bankName: selectedAccount.bankName,
            accountType: selectedAccount.accountType,
          }
        : null,
    })
    const optimisticBreakdown = computeOptimisticBreakdown(
      incomeAmount,
      allocation,
      { allocateToBudget, account: selectedAccount },
    )

    applyOptimisticIncome(
      optimisticEntry,
      optimisticBreakdown,
      incomeAmount,
      selectedAccount,
    )

    resetLogForm()

    void (async () => {
      try {
        const response = await fetch("/api/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const data = (await response.json()) as IncomeBreakdown & {
          incomeEntryId?: string
          error?: string
        }
        if (!response.ok) {
          throw new Error(data.error || "Failed to calculate breakdown")
        }

        setBreakdown(data)

        const serverEntry = incomeEntryFromCalculateResponse(data, {
          description: trimmedDescription,
          date,
          periodStart,
          periodEnd,
          account: selectedAccount,
        })
        if (serverEntry) {
          replaceOptimisticIncomeEntry(optimisticId, serverEntry)
        }

        await reconcileIncomeData({ silent: true })
      } catch (err) {
        rollbackIncomeLog(snapshot)
        setError(
          err instanceof Error ? err.message : "An error occurred. Please try again.",
        )
      } finally {
        incomeLogInFlightRef.current = false
      }
    })()

    return true
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

    const deletedId = deleteEntryId
    const deletedEntry =
      incomeEntries.find((entry) => entry.id === deletedId) ??
      sourceEntries.find((entry) => entry.id === deletedId)

    const snapshot: IncomeLogSnapshot = {
      allocation,
      accounts,
      breakdown,
      incomeStats,
      sourceEntries,
      incomeEntries,
      incomeTotal,
      incomePage,
    }

    const newTotal = Math.max(0, incomeTotal - 1)
    const totalPages = Math.max(1, Math.ceil(newTotal / CONSOLE_TABLE_PAGE_SIZE))
    const nextPage =
      incomeEntries.length <= 1 && incomePage > 1 ? incomePage - 1 : incomePage
    const resolvedPage = incomePage > totalPages ? totalPages : nextPage

    setDeleteEntryId(null)
    setIncomeEntries((prev) => prev.filter((entry) => entry.id !== deletedId))
    setSourceEntries((prev) => prev.filter((entry) => entry.id !== deletedId))
    setIncomeTotal(newTotal)
    if (resolvedPage !== incomePage) {
      setIncomePage(resolvedPage)
    }

    if (deletedEntry) {
      setIncomeStats((prev) => {
        let next = { ...prev }
        if (isInCurrentMonth(deletedEntry.date)) {
          next = {
            ...next,
            currentMonthTotal: Math.max(
              0,
              next.currentMonthTotal - deletedEntry.amount,
            ),
          }
        }
        return next
      })
      if (deletedEntry.account) {
        setAccounts((prev) =>
          prev.map((row) =>
            row.id === deletedEntry.account!.id
              ? { ...row, balance: row.balance - deletedEntry.amount }
              : row,
          ),
        )
      }
    }

    void (async () => {
      try {
        const response = await fetch(`/api/income-entries/${deletedId}`, {
          method: "DELETE",
        })
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to delete income entry")
        }
        await reconcileIncomeData({ historyPage: resolvedPage, silent: true })
      } catch {
        rollbackIncomeLog(snapshot)
      }
    })()
  }

  const clearBreakdown = useCallback(() => {
    setBreakdown(null)
  }, [])

  const parseBulkDate = (raw: string | undefined): string | null => {
    if (!raw || !raw.trim()) return null
    const s = raw.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (dmy) {
      const [, d, m, y] = dmy
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
    }
    return null
  }

  const parseAllocateFlag = (raw: string | undefined): boolean | null => {
    if (!raw || !raw.trim()) return null
    const s = raw.trim().toLowerCase()
    if (["false", "no", "n", "0"].includes(s)) return false
    if (["true", "yes", "y", "1"].includes(s)) return true
    return null
  }

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!allocation) {
      setError("Please configure your fund allocation settings first.")
      return
    }

    const today = new Date().toISOString().split("T")[0]!
    const lines = bulkText
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean)

    if (lines.length === 0) {
      setError(
        "Paste at least one line. Columns: date, amount, description, allocate (optional).",
      )
      return
    }

    const rows = lines.map((line) => {
      const parts = line.split(/[\t,]/).map((p) => p.trim())
      const parsedDate = parseBulkDate(parts[0])
      const amt = parseMoneyInput(parts[1], currencyCode)
      const desc = parts[2] || null
      const allocateFromRow = parseAllocateFlag(parts[3])
      return {
        amount: Number.isFinite(amt) ? amt : 0,
        description: desc,
        date: parsedDate ?? today,
        allocateToBudget: allocateFromRow ?? bulkAllocateToBudget,
      }
    })

    if (rows.some((r) => r.amount <= 0)) {
      setError("Every line must have a valid positive amount in column 2.")
      return
    }

    const rowCount = rows.length
    const toastId = toastLoading(`Importing ${rowCount} income entr${rowCount === 1 ? "y" : "ies"}…`)
    setBulkText("")
    setShowBulkForm(false)

    void (async () => {
      setSubmittingBulk(true)
      try {
        const response = await fetch("/api/income-entries/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: bulkAccountId || undefined,
            entries: rows,
          }),
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || "Bulk import failed")
        }
        toastUpdate(
          toastId,
          `${data.created} income entr${data.created === 1 ? "y" : "ies"} imported. Total: ${(data.total ?? 0).toFixed(2)}`,
          "success",
        )
        await reconcileIncomeData({ silent: true })
      } catch (err) {
        toastUpdate(
          toastId,
          err instanceof Error ? err.message : "Bulk import failed",
          "error",
        )
        setError(err instanceof Error ? err.message : "Bulk import failed")
        await reconcileIncomeData({ silent: true })
      } finally {
        setSubmittingBulk(false)
      }
    })()
  }

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
    setError,
    fieldErrors,
    clearFieldError,
    clearFieldErrors,
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
    editingEntryId,
    resetLogForm,
    startEditEntry,
    handleSubmit,
    formatDate,
    handleDeleteEntry,
    showBulkForm,
    setShowBulkForm,
    bulkText,
    setBulkText,
    bulkAccountId,
    setBulkAccountId,
    bulkAllocateToBudget,
    setBulkAllocateToBudget,
    submittingBulk,
    handleBulkSubmit,
  }
}

export type UseIncomePageResult = ReturnType<typeof useIncomePage>
