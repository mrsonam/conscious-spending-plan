"use client"

import { useState, useEffect, useCallback } from "react"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { NetWorthChart, type NetWorthSnapshot } from "./net-worth-chart"

const RANGE_OPTIONS = [
  { label: "6 months", value: 6 },
  { label: "12 months", value: 12 },
  { label: "24 months", value: 24 },
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

export function NetWorthBento() {
  const { formatCurrency } = useFormatCurrency()
  const [months, setMonths] = useState(12)
  const [data, setData] = useState<NetWorthSnapshot[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback((m: number) => {
    setLoading(true)
    setError(null)
    fetch(`/api/net-worth-history?months=${m}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error)
        setData(json.snapshots)
      })
      .catch((e) => setError(e.message ?? "Failed to load"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(months) }, [months, load])

  const latest = data?.[data.length - 1]

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
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold" style={{ color: TOKENS.onSurface }}>
            Net worth
          </h2>
          <p className="mt-0.5 text-[12px]" style={{ color: TOKENS.onSurfaceMuted }}>
            Cash + investments + loans out — recorded monthly
          </p>
          {latest && !loading && (
            <p className="mt-2 text-2xl font-black tabular-nums" style={{ color: TOKENS.primary }}>
              {formatCurrency(latest.netWorth)}
            </p>
          )}
        </div>
        <div
          className="flex rounded-xl border p-0.5"
          style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surface }}
        >
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setMonths(opt.value)}
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
