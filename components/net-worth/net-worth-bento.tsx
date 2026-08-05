"use client"

import { useState, useEffect, useCallback } from "react"
import { TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { consoleFocus } from "@/components/wealth-console/console-ui"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { NetWorthChart, type NetWorthSnapshot } from "./net-worth-chart"

const RANGE_OPTIONS = [
  { label: "6M", value: 6 },
  { label: "12M", value: 12 },
  { label: "24M", value: 24 },
]

function SkeletonPulse() {
  return (
    <div className="flex flex-col gap-2 px-2" style={{ height: 280 }}>
      <div className="mt-auto flex items-end gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse flex-1 rounded-t"
            style={{
              height: `${30 + Math.sin(i) * 20 + 40}px`,
              background: TOKENS.surfaceHigh,
            }}
          />
        ))}
      </div>
    </div>
  )
}

export function NetWorthBento({
  months: controlledMonths,
  hideRangeSelector = false,
}: {
  months?: number
  hideRangeSelector?: boolean
} = {}) {
  const { formatCurrency } = useFormatCurrency()
  const [internalMonths, setInternalMonths] = useState(12)
  const months = controlledMonths ?? internalMonths
  const [data, setData] = useState<NetWorthSnapshot[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = useCallback((m: number) => {
    fetch(`/api/net-worth-history?months=${m}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error)
        setData(json.snapshots)
      })
      .catch((e) => setError(e.message ?? "Failed to load"))
      .finally(() => setLoading(false))
  }, [])

  // Range change comes from a click handler, so sync setState is fine there.
  const changeMonths = useCallback((m: number) => {
    if (controlledMonths !== undefined) return
    setInternalMonths(m)
    setLoading(true)
    setError(null)
  }, [controlledMonths])

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchHistory(months)
  }, [months, fetchHistory])

  const latest = data?.[data.length - 1]
  const prev = data && data.length >= 2 ? data[data.length - 2] : null
  const delta = latest && prev ? latest.netWorth - prev.netWorth : null
  const deltaPct = delta !== null && prev && prev.netWorth !== 0
    ? (delta / Math.abs(prev.netWorth)) * 100
    : null
  const isUp = delta !== null && delta >= 0

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
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: TOKENS.onSurfaceMuted }}
          >
            Net worth
          </p>

          {loading ? (
            <div className="mt-3 h-10 w-40 animate-pulse rounded-lg" style={{ background: TOKENS.surfaceHigh }} />
          ) : latest ? (
            <>
              <p
                className="mt-2 text-3xl font-black tabular-nums tracking-tight sm:text-4xl"
                style={{ color: TOKENS.onSurface }}
              >
                {formatCurrency(latest.netWorth)}
              </p>

              {delta !== null && (
                <div className="mt-2 flex items-center gap-1.5 text-[12px] font-medium tabular-nums">
                  {isUp
                    ? <TrendingUp className="h-3.5 w-3.5 shrink-0" style={{ color: TOKENS.primary }} />
                    : <TrendingDown className="h-3.5 w-3.5 shrink-0" style={{ color: TOKENS.loss }} />
                  }
                  <span style={{ color: isUp ? TOKENS.primary : TOKENS.loss }}>
                    {isUp ? "+" : "−"}{formatCurrency(Math.abs(delta))}
                    {deltaPct !== null && ` · ${Math.abs(deltaPct).toFixed(1)}%`}
                  </span>
                  <span style={{ color: TOKENS.onSurfaceMuted }}>vs last month</span>
                </div>
              )}
            </>
          ) : null}

          <p className="mt-2 text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>
            Cash · Investments · Super
          </p>
        </div>

        {/* Range selector */}
        {!hideRangeSelector ? (
        <div
          className="flex rounded-xl border p-0.5"
          style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surface }}
        >
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => changeMonths(opt.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-[background-color,color,box-shadow,transform] active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100",
                consoleFocus,
              )}
              style={{
                background: months === opt.value ? TOKENS.surfaceHigh : "transparent",
                color: months === opt.value ? TOKENS.primary : TOKENS.onSurfaceMuted,
                boxShadow: months === opt.value ? CARD_INSET : "none",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        ) : null}
      </div>

      {/* Chart area */}
      {loading ? (
        <SkeletonPulse />
      ) : error ? (
        <div
          className="flex h-[280px] items-center justify-center rounded-xl text-[13px]"
          style={{ background: TOKENS.surface, color: TOKENS.onSurfaceMuted }}
        >
          {error}
        </div>
      ) : data && data.length > 0 ? (
        <NetWorthChart data={data} formatCurrency={formatCurrency} />
      ) : (
        <div
          className="flex h-[280px] items-center justify-center rounded-xl text-[13px]"
          style={{ background: TOKENS.surface, color: TOKENS.onSurfaceMuted }}
        >
          Your first snapshot will appear here next month.
        </div>
      )}
    </div>
  )
}
