"use client"

import { useEffect, useState } from "react"
import { fetchJsonAndCache } from "@/lib/client-fetch-cache"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { TOKENS } from "@/lib/wealth-console-tokens"

type NetWorthPoint = { label: string; netWorth: number }

const CACHE_KEY = "dashboard:networth-history"

/**
 * Compact 6-month net worth trend for the Aggregate card. Fetches lazily and
 * renders nothing on failure or when there isn't enough history, the card
 * reads fine without it.
 */
export function ConsoleNetWorthSparkline() {
  const { formatCurrency } = useFormatCurrency()
  const [series, setSeries] = useState<NetWorthPoint[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchJsonAndCache<{ snapshots?: NetWorthPoint[] }>(
      CACHE_KEY,
      "/api/net-worth-history?months=6",
    )
      .then((data) => {
        if (!cancelled) setSeries(data.snapshots ?? [])
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (failed) return null

  if (series === null) {
    return (
      <div
        className="mt-4 h-12 w-full animate-pulse rounded-md"
        style={{ background: TOKENS.surfaceLow }}
        aria-hidden
      />
    )
  }

  if (series.length < 2) return null

  const values = series.map((s) => s.netWorth)
  const min = Math.min(...values)
  const max = Math.max(...values, min + 1)
  const first = values[0]
  const last = values[values.length - 1]
  const delta = last - first
  const rising = delta >= 0

  // Normalized 100×40 space; non-scaling stroke keeps the line crisp when the
  // SVG stretches to the card width.
  const w = 100
  const h = 40
  const pad = 2
  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2)
    const y = pad + (1 - (v - min) / (max - min)) * (h - pad * 2)
    return `${x},${y}`
  })
  const areaPoints = `${pad},${h} ${points.join(" ")} ${w - pad},${h}`
  const lineColor = rising ? TOKENS.primary : TOKENS.loss

  return (
    <div className="mt-4">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="h-12 w-full"
        aria-hidden
      >
        {/* Area fades in once the line has mostly drawn */}
        <polygon
          points={areaPoints}
          fill={lineColor}
          className="csp-chart-fade"
          style={{ "--csp-fade-to": 0.08 } as React.CSSProperties}
        />
        <polyline
          fill="none"
          stroke={lineColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          pathLength={100}
          className="csp-line-draw"
          points={points.join(" ")}
        />
      </svg>
      <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p
          className="text-[10px] font-medium uppercase tracking-wider"
          style={{ color: TOKENS.onSurfaceMuted }}
        >
          Last 6 months
        </p>
        <p
          className="csp-chart-fade text-[11px] font-semibold tabular-nums"
          style={{ color: lineColor }}
        >
          {rising ? "+" : "−"}
          {formatCurrency(Math.abs(delta))}
        </p>
      </div>
      <p className="sr-only">
        Net worth over the last {series.length} months: from{" "}
        {formatCurrency(first)} in {series[0].label} to {formatCurrency(last)}{" "}
        in {series[series.length - 1].label}.
      </p>
    </div>
  )
}
