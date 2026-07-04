"use client"

import { useEffect, useMemo, useState } from "react"
import { fetchJsonAndCache } from "@/lib/client-fetch-cache"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import type { SpendingTrendMonth } from "@/components/trends/spending-trends-chart"

export type TrendsReportMonth = SpendingTrendMonth & {
  expenseCategories: Record<string, number>
}

export type TrendsReportPayload = {
  months: TrendsReportMonth[]
  topCategories: string[]
  incomeSources: Array<{ label: string; total: number }>
}

export type TrendsInsight = {
  text: string
  tone: "positive" | "caution" | "neutral"
}

export type TrendsReport = {
  loading: boolean
  error: string | null
  months: TrendsReportMonth[]
  topCategories: string[]
  incomeSources: Array<{ label: string; total: number }>
  /** Total spend (all four pillars) per month, aligned with `months`. */
  totalSpendSeries: number[]
  /** Savings rate % per month (null when no income that month). */
  savingsRateSeries: Array<number | null>
  avgMonthlySpend: number
  avgMonthlyIncome: number
  /** Latest complete-ish month vs the one before (% change in spend). */
  momSpendPct: number | null
  insights: TrendsInsight[]
}

export function monthTotalSpend(m: SpendingTrendMonth): number {
  return (
    m.spend.fixedCosts +
    m.spend.savings +
    m.spend.investment +
    m.spend.guiltFreeSpending
  )
}

export function useTrendsReport(months: number): TrendsReport {
  const { formatCurrency } = useFormatCurrency()
  const [payload, setPayload] = useState<TrendsReportPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchJsonAndCache<TrendsReportPayload>(
      `trends:report:${months}`,
      `/api/spending-trends?months=${months}`,
    )
      .then((data) => {
        if (cancelled) return
        setPayload(data)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : "Failed to load trends")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [months])

  return useMemo(() => {
    const rows = payload?.months ?? []
    const totalSpendSeries = rows.map(monthTotalSpend)
    const savingsRateSeries = rows.map((m, i) =>
      m.totalIncome > 0
        ? ((m.totalIncome - totalSpendSeries[i]) / m.totalIncome) * 100
        : null,
    )

    // Averages exclude the current (partial) month so they aren't dragged down.
    const complete = rows.slice(0, -1)
    const completeSpend = totalSpendSeries.slice(0, -1)
    const avgBase = complete.length > 0 ? complete : rows
    const avgSpendBase = complete.length > 0 ? completeSpend : totalSpendSeries
    const avgMonthlySpend =
      avgSpendBase.length > 0
        ? avgSpendBase.reduce((s, v) => s + v, 0) / avgSpendBase.length
        : 0
    const avgMonthlyIncome =
      avgBase.length > 0
        ? avgBase.reduce((s, m) => s + m.totalIncome, 0) / avgBase.length
        : 0

    // MoM: last two complete months when available.
    let momSpendPct: number | null = null
    if (completeSpend.length >= 2) {
      const prev = completeSpend[completeSpend.length - 2]
      const last = completeSpend[completeSpend.length - 1]
      if (prev > 0) momSpendPct = ((last - prev) / prev) * 100
    }

    const insights: TrendsInsight[] = []
    if (complete.length >= 2) {
      let maxIdx = 0
      for (let i = 1; i < completeSpend.length; i++) {
        if (completeSpend[i] > completeSpend[maxIdx]) maxIdx = i
      }
      if (completeSpend[maxIdx] > 0) {
        insights.push({
          text: `${complete[maxIdx].label} was your highest-spend month at ${formatCurrency(completeSpend[maxIdx])}.`,
          tone: "neutral",
        })
      }
    }
    if (momSpendPct !== null && Math.abs(momSpendPct) >= 10) {
      insights.push({
        text: `Spending ${momSpendPct > 0 ? "rose" : "fell"} ${Math.abs(momSpendPct).toFixed(0)}% between the last two complete months.`,
        tone: momSpendPct > 0 ? "caution" : "positive",
      })
    }
    const knownRates = savingsRateSeries
      .slice(0, -1)
      .filter((r): r is number => r !== null)
    if (knownRates.length >= 2) {
      const avgRate = knownRates.reduce((s, v) => s + v, 0) / knownRates.length
      insights.push({
        text: `You keep an average of ${avgRate.toFixed(0)}% of income across this period.`,
        tone: avgRate >= 20 ? "positive" : "caution",
      })
    }
    if (avgMonthlySpend > 0) {
      insights.push({
        text: `Average outflow is ${formatCurrency(avgMonthlySpend)}/month over the period.`,
        tone: "neutral",
      })
    }

    return {
      loading,
      error,
      months: rows,
      topCategories: payload?.topCategories ?? [],
      incomeSources: payload?.incomeSources ?? [],
      totalSpendSeries,
      savingsRateSeries,
      avgMonthlySpend,
      avgMonthlyIncome,
      momSpendPct,
      insights: insights.slice(0, 3),
    }
  }, [payload, loading, error, formatCurrency])
}
