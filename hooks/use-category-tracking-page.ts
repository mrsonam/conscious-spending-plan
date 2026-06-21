"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
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
  getMonthElapsedFraction,
  sumDeployableBalance,
  trackingFundShort,
} from "@/lib/category-tracking-shared"
import {
  bucketTransferFlowByCategory,
  type CategoryBucketTransferApiRow,
} from "@/lib/category-bucket-transfer-shared"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import type { FundCategory } from "@/lib/fund-allocation-fields"
import { toastError, toastSuccess } from "@/lib/app-toast"
import {
  applyOptimisticBucketTransfer,
  applyOptimisticSavingsGeneralDelta,
  cloneCategoryTrackingState,
  createOptimisticBucketTransferId,
} from "@/lib/category-bucket-transfer-optimistic"

type TrackingApiPayload = {
  tracking: Record<string, CategoryTrackingRow>
  totalIncomeForMonth?: number
  savingsGeneralAvailable?: number
  savingsAssignedToGoals?: number
  bucketTransfers?: CategoryBucketTransferApiRow[]
  heroDeployable?: number
  planVsLiquid?: {
    liquidTotal?: number
    deployable?: number
    gap?: number
    adjusted?: boolean
  }
}

type HistoryApiPayload = {
  history: Record<
    string,
    Array<{ month: string; allocated: number; spent: number; remaining: number }>
  >
}

const SUMMARY_MAX_AGE_MS = 60_000
const HISTORY_MAX_AGE_MS = 120_000

function periodCacheKeys(month: number, year: number) {
  const periodKey = `${year}-${month}`
  return {
    summary: `category-tracking:v9:summary:${periodKey}`,
    history: `category-tracking:v9:history`,
  }
}

export function useCategoryTrackingPage() {
  const { data: session, status } = useSession()
  const { formatCurrency, currencyCode } = useFormatCurrency()
  const router = useRouter()
  const loadSeq = useRef(0)

  const [tracking, setTracking] = useState<Record<string, CategoryTrackingRow> | null>(null)
  const [totalIncomeForMonth, setTotalIncomeForMonth] = useState<number | null>(null)
  const [savingsGeneralAvailable, setSavingsGeneralAvailable] = useState(0)
  const [savingsAssignedToGoals, setSavingsAssignedToGoals] = useState(0)
  const [bucketTransfers, setBucketTransfers] = useState<CategoryBucketTransferApiRow[]>([])
  const [history, setHistory] = useState<Record<
    string,
    Array<{ month: string; allocated: number; spent: number; remaining: number }>
  > | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferError, setTransferError] = useState<string | null>(null)
  const [heroDeployable, setHeroDeployable] = useState<number | null>(null)

  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  const applySummaryPayload = useCallback((data: TrackingApiPayload) => {
    setTracking(data.tracking)
    setTotalIncomeForMonth(data.totalIncomeForMonth ?? null)
    setSavingsGeneralAvailable(data.savingsGeneralAvailable ?? 0)
    setSavingsAssignedToGoals(data.savingsAssignedToGoals ?? 0)
    setBucketTransfers(data.bucketTransfers ?? [])
    setHeroDeployable(data.heroDeployable ?? data.planVsLiquid?.liquidTotal ?? null)
  }, [])

  useLayoutEffect(() => {
    const keys = periodCacheKeys(selectedMonth, selectedYear)
    const peekSummary = peekCachedJson<TrackingApiPayload>(keys.summary, SUMMARY_MAX_AGE_MS)
    const peekHistory = peekCachedJson<HistoryApiPayload>(keys.history, HISTORY_MAX_AGE_MS)

    if (peekSummary) {
      applySummaryPayload(peekSummary)
      setLoading(false)
    }
    if (peekHistory) {
      setHistory(peekHistory.history)
    }
  }, [applySummaryPayload, selectedMonth, selectedYear])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  const fetchData = useCallback(
    async (opts?: { bypassCache?: boolean }) => {
      if (opts?.bypassCache) {
        invalidateCachedJson("category-tracking:v9:")
      }

      const seq = ++loadSeq.current
      const t = Date.now()
      const keys = periodCacheKeys(selectedMonth, selectedYear)

      const peekSummary = peekCachedJson<TrackingApiPayload>(keys.summary, SUMMARY_MAX_AGE_MS)
      const peekHistory = peekCachedJson<HistoryApiPayload>(keys.history, HISTORY_MAX_AGE_MS)

      if (peekSummary) {
        applySummaryPayload(peekSummary)
        setLoading(false)
        setRefreshing(true)
      } else {
        setLoading(true)
        setRefreshing(false)
      }
      if (peekHistory) {
        setHistory(peekHistory.history)
      }

      void fetchJsonAndCache<TrackingApiPayload>(
        keys.summary,
        `/api/category-tracking?month=${selectedMonth}&year=${selectedYear}&t=${t}`,
      )
        .then((summaryData) => {
          if (seq !== loadSeq.current) return
          applySummaryPayload(summaryData)
          setLoading(false)
          setRefreshing(false)
        })
        .catch((e) => {
          console.error("Error fetching category tracking summary:", e)
          if (seq !== loadSeq.current) return
          if (!peekSummary) {
            setTracking(null)
            setTotalIncomeForMonth(null)
          }
          setLoading(false)
          setRefreshing(false)
        })

      void fetchJsonAndCache<HistoryApiPayload>(keys.history, `/api/category-tracking/history?t=${t}`)
        .then((historyData) => {
          if (seq !== loadSeq.current) return
          setHistory(historyData.history)
        })
        .catch((e) => {
          console.error("Error fetching category tracking history:", e)
          if (seq !== loadSeq.current) return
          if (!peekHistory) setHistory(null)
        })
    },
    [applySummaryPayload, selectedMonth, selectedYear],
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
  const pillarRemaining = tracking
    ? sumDeployableBalance(tracking, savingsGeneralAvailable, savingsAssignedToGoals)
    : 0
  const totalRemaining =
    heroDeployable != null && heroDeployable > 0 ? heroDeployable : pillarRemaining
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

  const bucketTransferFlow = useMemo(
    () => bucketTransferFlowByCategory(bucketTransfers),
    [bucketTransfers],
  )

  const isCurrentMonth =
    selectedMonth === now.getMonth() + 1 && selectedYear === now.getFullYear()

  const openTransferDialog = useCallback(() => {
    setTransferError(null)
    setTransferOpen(true)
  }, [])

  const transferBucketFunds = useCallback(
    async (payload: {
      fromCategory: FundCategory
      toCategory: FundCategory
      amount: number
    }) => {
      if (!tracking) return

      setTransferError(null)

      const snapshot = cloneCategoryTrackingState(
        tracking,
        bucketTransfers,
        savingsGeneralAvailable
      )

      const optimisticId = createOptimisticBucketTransferId()
      const optimistic = applyOptimisticBucketTransfer({
        tracking,
        bucketTransfers,
        fromCategory: payload.fromCategory,
        toCategory: payload.toCategory,
        amount: payload.amount,
        optimisticId,
      })

      setTracking(optimistic.tracking)
      setBucketTransfers(optimistic.bucketTransfers)
      setSavingsGeneralAvailable((prev) =>
        applyOptimisticSavingsGeneralDelta(prev, payload.fromCategory, payload.amount)
      )

      setTransferOpen(false)

      const fromLabel = trackingFundShort(payload.fromCategory)
      const toLabel = trackingFundShort(payload.toCategory)
      toastSuccess(`Moved ${formatCurrency(payload.amount)} from ${fromLabel} to ${toLabel}`)

      try {
        const res = await fetch("/api/category-tracking/transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            month: selectedMonth,
            year: selectedYear,
          }),
        })
        const data = (await res.json()) as { error?: string }
        if (!res.ok) {
          if (snapshot.tracking) setTracking(snapshot.tracking)
          setBucketTransfers(snapshot.bucketTransfers)
          setSavingsGeneralAvailable(snapshot.savingsGeneralAvailable)
          toastError(data.error ?? "Transfer failed")
          return
        }
        invalidateCachedJson("category-tracking:v9:")
        await fetchData({ bypassCache: true })
      } catch {
        if (snapshot.tracking) setTracking(snapshot.tracking)
        setBucketTransfers(snapshot.bucketTransfers)
        setSavingsGeneralAvailable(snapshot.savingsGeneralAvailable)
        toastError("Transfer failed")
      }
    },
    [
      bucketTransfers,
      fetchData,
      formatCurrency,
      savingsGeneralAvailable,
      selectedMonth,
      selectedYear,
      tracking,
    ]
  )

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

  return {
    session,
    status,
    tracking,
    totalIncomeForMonth,
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
    pillarRemaining,
    overallUsage,
    elapsed,
    categoryDistribution,
    allocationMix,
    momSpend,
    savingsGeneralAvailable,
    savingsAssignedToGoals,
    bucketTransfers,
    bucketTransferFlow,
    currencyCode,
    isCurrentMonth,
    transferOpen,
    setTransferOpen,
    openTransferDialog,
    transferError,
    transferBucketFunds,
  }
}

export type UseCategoryTrackingPageResult = ReturnType<typeof useCategoryTrackingPage>
