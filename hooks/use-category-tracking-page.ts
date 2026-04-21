"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  fetchJsonAndCache,
  invalidateCachedJson,
  peekCachedJson,
} from "@/lib/client-fetch-cache"
import {
  type CategoryTrackingRow,
  FUND_KEYS,
  TRACKING_FUND_CATEGORIES,
  expenseTypeLabel,
  getMonthElapsedFraction,
} from "@/lib/category-tracking-shared"
import { useFormatCurrency } from "@/hooks/use-format-currency"

export type CategoryTrackingExpense = {
  id: string
  amount: number
  description?: string | null
  date: string
  category?: string | null
  expenseCategory?: string | null
  account?: { name?: string; bankName?: string }
}

type TrackingApiPayload = {
  tracking: Record<string, CategoryTrackingRow>
  totalIncomeForMonth?: number
}

type HistoryApiPayload = {
  history: Record<
    string,
    Array<{ month: string; allocated: number; spent: number; remaining: number }>
  >
}

const SUMMARY_MAX_AGE_MS = 60_000
const EXPENSES_MAX_AGE_MS = 45_000
const HISTORY_MAX_AGE_MS = 120_000

export function useCategoryTrackingPage() {
  const { data: session, status } = useSession()
  const { formatCurrency } = useFormatCurrency()
  const router = useRouter()
  const loadSeq = useRef(0)

  const [tracking, setTracking] = useState<Record<string, CategoryTrackingRow> | null>(null)
  const [totalIncomeForMonth, setTotalIncomeForMonth] = useState<number | null>(null)
  const [expenses, setExpenses] = useState<CategoryTrackingExpense[]>([])
  const [history, setHistory] = useState<Record<
    string,
    Array<{ month: string; allocated: number; spent: number; remaining: number }>
  > | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  const fetchData = useCallback(
    async (opts?: { bypassCache?: boolean }) => {
      if (opts?.bypassCache) {
        invalidateCachedJson("category-tracking:")
      }

      const seq = ++loadSeq.current
      const t = Date.now()
      const periodKey = `${selectedYear}-${selectedMonth}`
      const cacheKeySummary = `category-tracking:summary:${periodKey}`
      const cacheKeyExpenses = `category-tracking:expenses:${periodKey}`
      const cacheKeyHistory = `category-tracking:history`

      const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1)
      const endOfMonth = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999)
      const expensesPath = `/api/expenses?startDate=${startOfMonth.toISOString()}&endDate=${endOfMonth.toISOString()}&category=fixedCosts,investment,savings,guiltFreeSpending&t=${t}`

      const peekSummary = peekCachedJson<TrackingApiPayload>(cacheKeySummary, SUMMARY_MAX_AGE_MS)
      const peekExpenses = peekCachedJson<{ expenses?: CategoryTrackingExpense[] }>(
        cacheKeyExpenses,
        EXPENSES_MAX_AGE_MS,
      )
      const peekHistory = peekCachedJson<HistoryApiPayload>(cacheKeyHistory, HISTORY_MAX_AGE_MS)

      if (peekSummary) {
        setTracking(peekSummary.tracking)
        setTotalIncomeForMonth(peekSummary.totalIncomeForMonth ?? null)
      }
      if (peekExpenses) {
        setExpenses(peekExpenses.expenses || [])
      }
      if (peekHistory) {
        setHistory(peekHistory.history)
      }

      if (peekSummary) {
        setLoading(false)
        setRefreshing(true)
      } else {
        setLoading(true)
        setRefreshing(false)
      }

      try {
        const [summaryData, expensesData, historyData] = await Promise.all([
          fetchJsonAndCache<TrackingApiPayload>(
            cacheKeySummary,
            `/api/category-tracking?month=${selectedMonth}&year=${selectedYear}&t=${t}`,
          ),
          fetchJsonAndCache<{ expenses?: CategoryTrackingExpense[] }>(cacheKeyExpenses, expensesPath),
          fetchJsonAndCache<HistoryApiPayload>(cacheKeyHistory, `/api/category-tracking/history?t=${t}`),
        ])

        if (seq !== loadSeq.current) return

        setTracking(summaryData.tracking)
        setTotalIncomeForMonth(summaryData.totalIncomeForMonth ?? null)
        setExpenses(expensesData.expenses || [])
        setHistory(historyData.history)
      } catch (e) {
        console.error("Error fetching category tracking:", e)
        if (seq !== loadSeq.current) return
        if (!peekSummary) {
          setTracking(null)
          setTotalIncomeForMonth(null)
          setExpenses([])
          setHistory(null)
        }
      } finally {
        if (seq === loadSeq.current) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    },
    [selectedMonth, selectedYear],
  )

  useEffect(() => {
    if (status === "authenticated") {
      void fetchData()
    }
  }, [status, fetchData])

  const monthOptions = useMemo(() => {
    const options: { value: string; label: string; month: number; year: number }[] = []
    const start = new Date()
    let year = start.getFullYear()
    let month = start.getMonth() + 1
    for (let i = 0; i < 24; i++) {
      const label = new Date(year, month - 1, 1).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
      options.push({ value: `${year}-${month}`, label, month, year })
      month -= 1
      if (month < 1) {
        month = 12
        year -= 1
      }
    }
    return options
  }, [])

  const selectedMonthLabel =
    monthOptions.find((o) => o.month === selectedMonth && o.year === selectedYear)?.label ??
    new Date(selectedYear, selectedMonth - 1).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    })

  const formatDate = useCallback(
    (dateString: string) =>
      new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    [],
  )

  const totalAllocated = tracking
    ? FUND_KEYS.reduce((s, k) => s + (tracking[k]?.allocated ?? 0), 0)
    : 0
  const totalSpent = tracking
    ? FUND_KEYS.reduce((s, k) => s + (tracking[k]?.spent ?? 0), 0)
    : 0
  const totalRemaining = tracking
    ? FUND_KEYS.reduce((s, k) => s + (tracking[k]?.remaining ?? 0), 0)
    : 0
  const overallUsage = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0

  const elapsed = getMonthElapsedFraction(selectedMonth, selectedYear)

  const categoryDistribution = useMemo(() => {
    if (!tracking) return []
    return TRACKING_FUND_CATEGORIES.map((cat) => ({
      name: cat.label,
      value: tracking[cat.key]?.spent || 0,
      color: cat.colorHex,
    })).filter((item) => item.value > 0)
  }, [tracking])

  const allocationMix = useMemo(() => {
    if (!tracking || !totalIncomeForMonth || totalIncomeForMonth <= 0) return []
    return TRACKING_FUND_CATEGORIES.map((c) => ({
      key: c.key,
      label: c.short,
      pct: ((tracking[c.key]?.allocated ?? 0) / totalIncomeForMonth) * 100,
      amount: tracking[c.key]?.allocated ?? 0,
      color: c.colorHex,
    }))
  }, [tracking, totalIncomeForMonth])

  const spendShare = useMemo(() => {
    if (!tracking || totalSpent <= 0) return []
    return TRACKING_FUND_CATEGORIES.map((c) => ({
      key: c.key,
      label: c.label,
      pct: ((tracking[c.key]?.spent ?? 0) / totalSpent) * 100,
      amount: tracking[c.key]?.spent ?? 0,
      color: c.colorHex,
    })).filter((x) => x.amount > 0)
  }, [tracking, totalSpent])

  const expenseTypeRollup = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of expenses) {
      if (e.category === "investment") continue
      const k = e.expenseCategory?.trim() || "other"
      m.set(k, (m.get(k) ?? 0) + e.amount)
    }
    return [...m.entries()]
      .map(([key, amount]) => ({
        key,
        label: expenseTypeLabel(key),
        amount,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
  }, [expenses])

  const momSpend = useMemo(() => {
    if (!history?.fixedCosts?.length || history.fixedCosts.length < 2) return null
    const n = history.fixedCosts.length
    const lastIdx = n - 1
    const prevIdx = n - 2
    let last = 0
    let prev = 0
    for (const k of FUND_KEYS) {
      const series = history[k]
      if (!series) continue
      last += series[lastIdx]?.spent ?? 0
      prev += series[prevIdx]?.spent ?? 0
    }
    if (prev <= 0) return { delta: last - prev, pct: null as number | null }
    const pct = ((last - prev) / prev) * 100
    return { delta: last - prev, pct }
  }, [history])

  const chartRows = useMemo(() => {
    if (!history?.fixedCosts?.length) return []
    return history.fixedCosts.map((_, i) => ({
      month: history.fixedCosts[i]?.month ?? "",
      "Fixed costs": history.fixedCosts[i]?.spent ?? 0,
      Investment: history.investment[i]?.spent ?? 0,
      Savings: history.savings[i]?.spent ?? 0,
      "Guilt-free": history.guiltFreeSpending[i]?.spent ?? 0,
    }))
  }, [history])

  const lineRows = useMemo(() => {
    if (!history?.fixedCosts?.length) return []
    return history.fixedCosts.map((_, i) => ({
      month: history.fixedCosts[i]?.month ?? "",
      "Fixed costs": history.fixedCosts[i]?.remaining ?? 0,
      Investment: history.investment[i]?.remaining ?? 0,
      Savings: history.savings[i]?.remaining ?? 0,
      "Guilt-free": history.guiltFreeSpending[i]?.remaining ?? 0,
    }))
  }, [history])

  const insights = useMemo(() => {
    if (!tracking) return [] as { kind: "warn" | "ok" | "tip"; title: string; body: string }[]
    const out: { kind: "warn" | "ok" | "tip"; title: string; body: string }[] = []
    const expected = elapsed * 100

    for (const cat of TRACKING_FUND_CATEGORIES) {
      const data = tracking[cat.key]
      if (!data || data.allocated <= 0) continue
      const usage = (data.spent / data.allocated) * 100
      if (data.overspent > 0) {
        out.push({
          kind: "warn",
          title: cat.label,
          body: `Overspent by ${formatCurrency(data.overspent)} this month. ${
            data.overspentFromTransfer
              ? `Includes ${formatCurrency(data.overspentFromTransfer)} from transfers not yet reflected as spend.`
              : "Review discretionary spending or adjust next month’s allocation."
          }`,
        })
        continue
      }
      if (elapsed >= 0.12 && elapsed < 1) {
        const projected = (data.spent / elapsed) - data.allocated
        if (projected > 0 && data.spent > 0) {
          out.push({
            kind: "tip",
            title: `${cat.label} pace`,
            body: `At the current rate you may exceed this bucket by about ${formatCurrency(projected)} by month-end.`,
          })
        }
      }
      if (!data.overspent && usage < expected * 0.85 && elapsed > 0.25 && elapsed < 1) {
        out.push({
          kind: "ok",
          title: `${cat.label} under pace`,
          body: `Spending is ${usage.toFixed(0)}% of the bucket vs ~${expected.toFixed(0)}% of the month elapsed — room to spare.`,
        })
      }
    }

    if (out.length === 0 && tracking && Object.keys(tracking).length > 0) {
      out.push({
        kind: "ok",
        title: "No red flags",
        body: "Buckets are within range for the selected month. Keep logging expenses for sharper forecasts.",
      })
    }
    return out.slice(0, 6)
  }, [tracking, elapsed, formatCurrency])

  return {
    session,
    status,
    tracking,
    totalIncomeForMonth,
    expenses,
    history,
    loading,
    refreshing,
    selectedMonth,
    selectedYear,
    setSelectedMonth,
    setSelectedYear,
    fetchData,
    monthOptions,
    selectedMonthLabel,
    formatCurrency,
    formatDate,
    totalAllocated,
    totalSpent,
    totalRemaining,
    overallUsage,
    elapsed,
    categoryDistribution,
    allocationMix,
    spendShare,
    expenseTypeRollup,
    momSpend,
    chartRows,
    lineRows,
    insights,
  }
}

export type UseCategoryTrackingPageResult = ReturnType<typeof useCategoryTrackingPage>
