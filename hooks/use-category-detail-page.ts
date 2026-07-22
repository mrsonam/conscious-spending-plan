"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  FUND_KEYS,
  TRACKING_FUND_CATEGORIES,
  getMonthElapsedFraction,
  netPillarHeadroom,
  savingsDisplayBreakdown,
  type CategoryTrackingRow,
  type TrackingFundKey,
} from "@/lib/category-tracking-shared"
import {
  bucketTransferFlowByCategory,
  type CategoryBucketTransferApiRow,
} from "@/lib/category-bucket-transfer-shared"
import { useFormatCurrency } from "@/hooks/use-format-currency"

type TrackingApiPayload = {
  tracking: Record<string, CategoryTrackingRow>
  savingsGeneralAvailable?: number
  savingsAssignedToGoals?: number
  bucketTransfers?: CategoryBucketTransferApiRow[]
  month?: number
  year?: number
}

type HistoryApiPayload = {
  history: Record<
    string,
    Array<{
      month: string
      monthNum: number
      year: number
      allocated: number
      spent: number
      remaining: number
      overspent: number
    }>
  >
}

export type CategoryDetailTransaction = {
  id: string
  type: "expense" | "transfer" | "bucket_transfer"
  amount: number
  date: string
  description: string | null
  expenseCategory?: string | null
  fromCategory?: string
  toCategory?: string
  accountLabel?: string
}

function prevPeriod(month: number, year: number) {
  if (month === 1) return { month: 12, year: year - 1 }
  return { month: month - 1, year }
}

function isValidCategory(category: string): category is TrackingFundKey {
  return (FUND_KEYS as readonly string[]).includes(category)
}

function buildMonthOptions() {
  const now = new Date()
  const options: { value: string; label: string; month: number; year: number }[] = []
  let year = now.getFullYear()
  let month = now.getMonth() + 1
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
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return (await res.json()) as T
}

export function useCategoryDetailPage(category: string) {
  const router = useRouter()
  const { formatCurrency } = useFormatCurrency()

  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [currentRow, setCurrentRow] = useState<CategoryTrackingRow | null>(null)
  const [previousRow, setPreviousRow] = useState<CategoryTrackingRow | null>(null)
  const [savingsGeneralAvailable, setSavingsGeneralAvailable] = useState(0)
  const [savingsAssignedToGoals, setSavingsAssignedToGoals] = useState(0)
  const [bucketTransfers, setBucketTransfers] = useState<CategoryBucketTransferApiRow[]>([])
  const [history, setHistory] = useState<
    HistoryApiPayload["history"][string]
  >([])
  const [transactions, setTransactions] = useState<CategoryDetailTransaction[]>([])
  const [previousMonthLabel, setPreviousMonthLabel] = useState("")

  const meta = useMemo(
    () => TRACKING_FUND_CATEGORIES.find((c) => c.key === category) ?? null,
    [category],
  )

  const valid = isValidCategory(category)

  const [monthOptions] = useState(buildMonthOptions)

  const selectedMonthLabel =
    monthOptions.find(
      (o) => o.month === selectedMonth && o.year === selectedYear,
    )?.label ?? ""

  const elapsed = getMonthElapsedFraction(selectedMonth, selectedYear)
  const bucketTransferFlow = useMemo(
    () => bucketTransferFlowByCategory(bucketTransfers),
    [bucketTransfers],
  )
  const flow = valid ? bucketTransferFlow[category] : { in: 0, out: 0 }

  // Guards against out-of-order responses when the month changes quickly:
  // only the latest request may commit state.
  const requestGeneration = useRef(0)

  const fetchData = useCallback(async () => {
    if (!valid) return
    const generation = ++requestGeneration.current
    setLoading(true)

    const prev = prevPeriod(selectedMonth, selectedYear)
    setPreviousMonthLabel(
      new Date(prev.year, prev.month - 1, 1).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      }),
    )

    try {
      const [currentData, prevData, historyData, txData] = await Promise.all([
        fetchJson<TrackingApiPayload>(
          `/api/category-tracking?month=${selectedMonth}&year=${selectedYear}&t=${Date.now()}`,
        ),
        fetchJson<TrackingApiPayload>(
          `/api/category-tracking?month=${prev.month}&year=${prev.year}&t=${Date.now()}`,
        ),
        fetchJson<HistoryApiPayload>(
          `/api/category-tracking/history?month=${selectedMonth}&year=${selectedYear}&t=${Date.now()}`,
        ),
        fetchJson<{ transactions?: CategoryDetailTransaction[] }>(
          `/api/category-tracking/${category}/transactions?month=${selectedMonth}&year=${selectedYear}&t=${Date.now()}`,
        ),
      ])
      if (generation !== requestGeneration.current) return

      setCurrentRow(currentData.tracking?.[category] ?? null)
      setPreviousRow(prevData.tracking?.[category] ?? null)
      setSavingsGeneralAvailable(currentData.savingsGeneralAvailable ?? 0)
      setSavingsAssignedToGoals(currentData.savingsAssignedToGoals ?? 0)
      setBucketTransfers(currentData.bucketTransfers ?? [])
      setHistory(historyData.history?.[category] ?? [])
      setTransactions(txData.transactions ?? [])
    } catch (e) {
      if (generation !== requestGeneration.current) return
      console.error("Error loading category detail:", e)
      setCurrentRow(null)
      setPreviousRow(null)
      setHistory([])
      setTransactions([])
    } finally {
      if (generation === requestGeneration.current) setLoading(false)
    }
  }, [category, selectedMonth, selectedYear, valid])

  useEffect(() => {
    if (!valid) {
      router.replace("/category-tracking")
      return
    }
    void fetchData()
  }, [valid, fetchData, router])

  const deployed =
    category === "investment"
      ? (currentRow?.transferred ?? 0)
      : (currentRow?.spent ?? 0)
  const prevDeployed =
    category === "investment"
      ? (previousRow?.transferred ?? 0)
      : (previousRow?.spent ?? 0)

  const headroom = currentRow ? netPillarHeadroom(currentRow) : 0
  const savingsBreakdown =
    category === "savings" && currentRow
      ? savingsDisplayBreakdown(
          currentRow,
          savingsAssignedToGoals,
          savingsGeneralAvailable,
        )
      : null
  const displayAmount =
    savingsBreakdown != null
      ? savingsBreakdown.spendable
      : (currentRow?.displayRemaining ?? headroom)
  const usageBase =
    category === "investment"
      ? (currentRow?.available ?? 0) > 0
        ? (currentRow?.available ?? 0)
        : (currentRow?.allocated ?? 0) + (currentRow?.carryover ?? 0)
      : (currentRow?.allocated ?? 0)
  const usagePercent = usageBase > 0 ? (deployed / usageBase) * 100 : 0

  const spendDelta = deployed - prevDeployed

  return {
    valid,
    meta,
    loading,
    selectedMonth,
    selectedYear,
    setSelectedMonth,
    setSelectedYear,
    monthOptions,
    selectedMonthLabel,
    previousMonthLabel,
    currentRow,
    previousRow,
    savingsGeneralAvailable,
    savingsAssignedToGoals,
    flow,
    history,
    transactions,
    formatCurrency,
    elapsed,
    deployed,
    prevDeployed,
    displayAmount,
    usagePercent,
    spendDelta,
  }
}

export type UseCategoryDetailPageResult = ReturnType<typeof useCategoryDetailPage>
