"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { fetchJsonAndCache } from "@/lib/client-fetch-cache"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { TOKENS } from "@/lib/wealth-console-tokens"

type NetWorthPoint = { label: string; netWorth: number }

const CACHE_KEY = "dashboard:networth-history"
const CHART_HEIGHT = 48

/**
 * Compact 6-month net worth trend for the Aggregate card. Fetches lazily and
 * renders nothing on failure or when there isn't enough history, the card
 * reads fine without it.
 */
export function ConsoleNetWorthSparkline() {
  const { formatCurrency } = useFormatCurrency()
  const [series, setSeries] = useState<NetWorthPoint[] | null>(null)
  const [failed, setFailed] = useState(false)

  // The polyline is built in real pixel coordinates instead of stretching a
  // normalized viewBox: stretching (preserveAspectRatio="none") needs
  // vector-effect to keep the stroke uniform, and Chrome computes dash
  // geometry in screen space for non-scaling strokes while pathLength
  // normalizes in user space — the mismatch chops the drawn line into dashes.
  //
  // Measurement uses a callback ref (not a mount effect) so it re-attaches
  // whenever the container node changes (skeleton → chart), and seeds the
  // width synchronously from clientWidth instead of waiting for an observer
  // frame.
  const [width, setWidth] = useState(0)
  const observerRef = useRef<ResizeObserver | null>(null)

  const attachContainer = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect()
    observerRef.current = null
    if (!node) return

    setWidth((prev) => {
      const next = Math.round(node.clientWidth)
      return next > 0 && next !== prev ? next : prev
    })
    const observer = new ResizeObserver((entries) => {
      const next = Math.round(entries[0]?.contentRect.width ?? 0)
      if (next > 0) setWidth((prev) => (prev === next ? prev : next))
    })
    observer.observe(node)
    observerRef.current = observer
  }, [])

  useEffect(() => {
    return () => observerRef.current?.disconnect()
  }, [])

  if (failed) return null

  if (series === null) {
    return (
      <div
        ref={attachContainer}
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

  const w = width
  const h = CHART_HEIGHT
  const pad = 2
  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2)
    const y = pad + (1 - (v - min) / (max - min)) * (h - pad * 2)
    return `${x},${y}`
  })
  const areaPoints = `${pad},${h} ${points.join(" ")} ${w - pad},${h}`
  const lineColor = rising ? TOKENS.primary : TOKENS.loss

  return (
    <div className="mt-4" ref={attachContainer}>
      {w > 0 ? (
        <svg
          viewBox={`0 0 ${w} ${h}`}
          width={w}
          height={h}
          className="block"
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
            pathLength={100}
            className="csp-line-draw"
            points={points.join(" ")}
          />
        </svg>
      ) : (
        <div className="h-12 w-full" aria-hidden />
      )}
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
