"use client"

import { useState, useEffect, useCallback } from "react"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { SpendingTrendsChart, type SpendingTrendMonth } from "./spending-trends-chart"

const RANGE_OPTIONS = [
  { label: "6 months", value: 6 },
  { label: "12 months", value: 12 },
  { label: "24 months", value: 24 },
]

function SkeletonBar({ width }: { width: string }) {
  return (
    <div
      className="animate-pulse rounded"
      style={{ height: 200, width, background: TOKENS.surfaceHigh }}
    />
  )
}

export function SpendingTrendsBento() {
  const { formatCurrency } = useFormatCurrency()
  const [months, setMonths] = useState(12)
  const [data, setData] = useState<SpendingTrendMonth[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTrends = useCallback((m: number) => {
    fetch(`/api/spending-trends?months=${m}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error)
        setData(json.months)
      })
      .catch((e) => setError(e.message ?? "Failed to load"))
      .finally(() => setLoading(false))
  }, [])

  // Range change comes from a click handler, so sync setState is fine there.
  const changeMonths = useCallback((m: number) => {
    setMonths(m)
    setLoading(true)
    setError(null)
  }, [])

  useEffect(() => {
    // State already initializes to (or was reset to) loading — fetch only.
    fetchTrends(months)
  }, [months, fetchTrends])

  return (
    <div
      className="rounded-2xl border p-5 sm:p-6"
      style={{
        background: TOKENS.surfaceContainer,
        borderColor: TOKENS.outlineGhost,
        boxShadow: CARD_INSET,
      }}
    >
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold" style={{ color: TOKENS.onSurface }}>
            Spending trends
          </h2>
          <p className="mt-0.5 text-[12px]" style={{ color: TOKENS.onSurfaceMuted }}>
            Actual spend by category vs. income
          </p>
        </div>
        <div
          className="flex rounded-xl border p-0.5"
          style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surface }}
        >
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => changeMonths(opt.value)}
              className="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors"
              style={{
                background: months === opt.value ? TOKENS.surfaceHigh : "transparent",
                color: months === opt.value ? TOKENS.onSurface : TOKENS.onSurfaceMuted,
                boxShadow: months === opt.value ? CARD_INSET : "none",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      {loading ? (
        <div className="flex items-end gap-1 px-2" style={{ height: 320 }}>
          {Array.from({ length: months === 6 ? 6 : months === 12 ? 12 : 18 }).map((_, i) => (
            <SkeletonBar key={i} width={`${100 / (months === 6 ? 6 : months === 12 ? 12 : 18)}%`} />
          ))}
        </div>
      ) : error ? (
        <div
          className="flex h-[320px] items-center justify-center rounded-xl text-[13px]"
          style={{ background: TOKENS.surface, color: TOKENS.onSurfaceMuted }}
        >
          {error}
        </div>
      ) : data ? (
        <SpendingTrendsChart data={data} formatCurrency={formatCurrency} />
      ) : null}
    </div>
  )
}
