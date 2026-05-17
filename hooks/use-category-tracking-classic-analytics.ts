"use client"

import { useMemo } from "react"
import {
  TRACKING_FUND_CATEGORIES,
  getMonthElapsedFraction,
  type CategoryTrackingRow,
} from "@/lib/category-tracking-shared"

type HistorySeries = Record<
  string,
  Array<{ month: string; allocated: number; spent: number; remaining: number }>
>

export function useCategoryTrackingClassicAnalytics(
  tracking: Record<string, CategoryTrackingRow> | null,
  history: HistorySeries | null,
  selectedMonth: number,
  selectedYear: number,
  formatCurrency: (amount: number) => string,
) {
  const elapsed = getMonthElapsedFraction(selectedMonth, selectedYear)

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
              : "Review discretionary spending or adjust next month's allocation."
          }`,
        })
        continue
      }
      if (elapsed >= 0.12 && elapsed < 1) {
        const projected = data.spent / elapsed - data.allocated
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
          body: `Spending is ${usage.toFixed(0)}% of the bucket vs ~${expected.toFixed(0)}% of the month elapsed. Room to spare.`,
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

  return { chartRows, lineRows, insights }
}
