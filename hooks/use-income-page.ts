"use client"

import { useCallback, useEffect, useState } from "react"
import type {
  FundAllocation,
  IncomeBreakdown,
  IncomeEntry,
  IncomePageAccount,
  IncomePageStats,
} from "@/lib/income-page-types"

const INCOME_LIMIT = 10

export function useIncomePage(
  status: string,
  router: { push: (path: string) => void },
) {
  const [allocation, setAllocation] = useState<FundAllocation | null>(null)
  const [accounts, setAccounts] = useState<IncomePageAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState("")
  const [breakdown, setBreakdown] = useState<IncomeBreakdown | null>(null)
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>([])
  const [incomeTotal, setIncomeTotal] = useState(0)
  const [incomePage, setIncomePage] = useState(1)
  const [income, setIncome] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState("")
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState("")
  const [loadingForm, setLoadingForm] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [allocateToBudget, setAllocateToBudget] = useState(true)
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null)
  const [incomeStats, setIncomeStats] = useState<IncomePageStats>({
    currentMonthTotal: 0,
    ytdTotal: 0,
    monthOverMonthPct: null,
    lastMonthIncome: 0,
  })

  const applyIncomeListPayload = useCallback((data: Record<string, unknown>) => {
    setIncomeEntries((data.entries as IncomeEntry[]) || [])
    setIncomeTotal((data.total as number) ?? 0)
    setIncomePage((data.page as number) ?? 1)
    if ("currentMonthTotal" in data) {
      setIncomeStats({
        currentMonthTotal: (data.currentMonthTotal as number) ?? 0,
        ytdTotal: (data.ytdTotal as number) ?? 0,
        monthOverMonthPct:
          data.monthOverMonthPct === null || data.monthOverMonthPct === undefined
            ? null
            : (data.monthOverMonthPct as number),
        lastMonthIncome: (data.lastMonthIncome as number) ?? 0,
      })
    }
  }, [])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated") {
      setLoadingForm(true)
      setLoadingHistory(true)

      Promise.all([
        fetch("/api/fund-allocation"),
        fetch("/api/accounts"),
        fetch("/api/income-entries"),
      ])
        .then(([allocationRes, accountsRes, incomeRes]) => {
          if (allocationRes.ok) {
            allocationRes.json().then((data) => {
              setAllocation(data)
              setLoadingForm(false)
            })
          } else {
            setLoadingForm(false)
          }

          if (accountsRes.ok) {
            accountsRes.json().then((data) => {
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
            })
          }

          if (incomeRes.ok) {
            incomeRes.json().then((data: Record<string, unknown>) => {
              applyIncomeListPayload(data)
              setLoadingHistory(false)
            })
          } else {
            setLoadingHistory(false)
          }
        })
        .catch(() => {
          setLoadingForm(false)
          setLoadingHistory(false)
        })

      const today = new Date()
      setDate(today.toISOString().split("T")[0])
      setAllocateToBudget(true)
    }
  }, [status, router, applyIncomeListPayload])

  const fetchIncomeEntries = useCallback(async (page: number = 1) => {
    setLoadingHistory(true)
    try {
      const response = await fetch(
        `/api/income-entries?page=${page}&limit=${INCOME_LIMIT}`,
      )
      if (response.ok) {
        const data = (await response.json()) as Record<string, unknown>
        applyIncomeListPayload(data)
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingHistory(false)
    }
  }, [applyIncomeListPayload])

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
        await fetchIncomeEntries(incomePage)
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
        const newTotal = incomeTotal - 1
        setIncomeTotal(newTotal)
        const totalPages = Math.max(1, Math.ceil(newTotal / INCOME_LIMIT))
        const nextPage = incomePage > totalPages ? totalPages : incomePage
        fetchIncomeEntries(
          incomeEntries.length <= 1 && incomePage > 1
            ? incomePage - 1
            : nextPage,
        )
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
    incomeTotal,
    incomePage,
    incomeLimit: INCOME_LIMIT,
    income,
    setIncome,
    description,
    setDescription,
    date,
    setDate,
    calculating,
    error,
    loadingForm,
    loadingHistory,
    allocateToBudget,
    setAllocateToBudget,
    deleteEntryId,
    setDeleteEntryId,
    fetchIncomeEntries,
    handleSubmit,
    formatDate,
    handleDeleteEntry,
  }
}

export type UseIncomePageResult = ReturnType<typeof useIncomePage>
