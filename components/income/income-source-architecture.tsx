"use client"

import { useEffect, useState, type ReactNode } from "react"
import { TrendingDown, TrendingUp } from "lucide-react"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { useLineDrawAnimation } from "@/hooks/use-line-draw"
import {
  INCOME_PAGE_ERROR_SOFT as ERROR_SOFT,
  type IncomeEntry,
  type IncomeMonthlyTotal,
  type IncomePageStats,
} from "@/lib/income-page-types"
import {
  groupIncomeSources,
  type IncomeSourceRow,
} from "@/lib/income-source-architecture"
import { cn } from "@/lib/utils"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"

type Props = {
  entries: IncomeEntry[]
  incomeStats: IncomePageStats
  loading: boolean
  className?: string
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])
  return reduced
}

function PanelShell({
  children,
  className,
  "aria-busy": ariaBusy,
  "aria-label": ariaLabel,
}: {
  children: ReactNode
  className?: string
  "aria-busy"?: boolean
  "aria-label"?: string
}) {
  return (
    <section
      className={cn("rounded-xl border p-6 sm:p-8", className)}
      style={{
        background: TOKENS.surfaceContainer,
        borderColor: TOKENS.outlineGhost,
        boxShadow: CARD_INSET,
      }}
      aria-busy={ariaBusy}
      aria-label={ariaLabel}
    >
      {children}
    </section>
  )
}

function Pulse({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-md ${className}`}
      style={{ background: TOKENS.surfaceLow }}
    />
  )
}

function OverallMomChip({ pct }: { pct: number | null }) {
  const positive = pct !== null && pct >= 0
  const tone =
    pct === null ? TOKENS.onSurfaceMuted : positive ? TOKENS.primary : ERROR_SOFT
  return (
    <div
      className="inline-flex items-center rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
      style={{
        background: `color-mix(in srgb, ${tone} 18%, ${TOKENS.surfaceLow})`,
        border: `1px solid ${TOKENS.outlineGhost}`,
        color: tone,
        boxShadow: CARD_INSET,
      }}
    >
      {pct === null ? (
        <span>-</span>
      ) : (
        <>
          {positive ? (
            <TrendingUp className="mr-2 h-4 w-4" strokeWidth={2} />
          ) : (
            <TrendingDown className="mr-2 h-4 w-4" strokeWidth={2} />
          )}
          {positive ? "+" : ""}
          {pct.toFixed(1)}% <span className="ml-1 opacity-75">vs prev. month</span>
        </>
      )}
    </div>
  )
}

function SourceMomCell({ row }: { row: IncomeSourceRow }) {
  if (row.isOther) {
    return (
      <span className="tabular-nums" style={{ color: TOKENS.onSurfaceMutedElevated }}>
        —
      </span>
    )
  }
  if (row.isNew || row.momPct === null) {
    return (
      <span
        className="text-[10px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: TOKENS.secondary }}
      >
        new
      </span>
    )
  }
  const positive = row.momPct >= 0
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium tabular-nums"
      style={{ color: positive ? TOKENS.primary : ERROR_SOFT }}
    >
      {positive ? (
        <TrendingUp className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
      ) : (
        <TrendingDown className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
      )}
      {positive ? "+" : ""}
      {row.momPct.toFixed(1)}%
    </span>
  )
}

function CompositionBar({
  rows,
  reducedMotion,
}: {
  rows: IncomeSourceRow[]
  reducedMotion: boolean
}) {
  const [revealed, setRevealed] = useState(reducedMotion)
  useEffect(() => {
    if (reducedMotion) {
      setRevealed(true)
      return
    }
    const id = requestAnimationFrame(() => setRevealed(true))
    return () => cancelAnimationFrame(id)
  }, [reducedMotion, rows])

  return (
    <div
      className="flex h-3 w-full min-w-0 overflow-hidden rounded-full"
      style={{ background: TOKENS.surfaceHigh }}
      role="img"
      aria-label={`Income composition: ${rows
        .map((r) => `${r.label} ${r.sharePct.toFixed(1)}%`)
        .join(", ")}`}
    >
      {rows.map((row) =>
        row.sharePct > 0 ? (
          <div
            key={row.label}
            className="min-w-[2px] shrink-0 origin-left"
            style={{
              width: `${row.sharePct}%`,
              background: row.color,
              transform: revealed ? "scaleX(1)" : "scaleX(0)",
              transition: reducedMotion ? undefined : "transform 0.65s ease-out",
            }}
          />
        ) : null,
      )}
    </div>
  )
}

function MonthlySparkline({
  totals,
  reducedMotion,
}: {
  totals: IncomeMonthlyTotal[]
  reducedMotion: boolean
}) {
  const w = 320
  const h = 48
  const padY = 6
  const values = totals.map((t) => t.total)
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 0)
  const flat = max <= 0 || max === min
  const animate = !reducedMotion && values.length >= 2
  const lineRef = useLineDrawAnimation<SVGPolylineElement>(animate)
  const points = values
    .map((v, i) => {
      const x = values.length <= 1 ? w / 2 : (i / (values.length - 1)) * w
      const y = flat
        ? h / 2
        : padY + (1 - (v - min) / (max - min)) * (h - padY * 2)
      return `${x},${y}`
    })
    .join(" ")

  return (
    <div>
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.22em]"
        style={{ color: TOKENS.onSurfaceMutedElevated }}
      >
        6-month inflow
      </p>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="mt-2 h-12 w-full overflow-visible"
        role="img"
        aria-label="Six-month total income trend"
      >
        <polyline
          ref={animate ? lineRef : undefined}
          fill="none"
          stroke={TOKENS.primary}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={animate ? 100 : undefined}
          strokeDasharray={animate ? 100 : undefined}
          points={points}
        />
      </svg>
      <div className="mt-1 flex justify-between px-0.5">
        {totals.map((t) => {
          const [y, m] = t.month.split("-").map(Number)
          const initial =
            y && m
              ? new Intl.DateTimeFormat("en-US", { month: "narrow" }).format(
                  new Date(y, m - 1, 1),
                )
              : "—"
          return (
            <span
              key={t.month}
              className="text-[10px] font-medium uppercase tabular-nums"
              style={{ color: TOKENS.onSurfaceMutedElevated }}
            >
              {initial}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export function IncomeSourceArchitectureSkeleton({
  className,
}: {
  className?: string
} = {}) {
  return (
    <PanelShell
      className={className}
      aria-busy={true}
      aria-label="Loading source architecture"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Pulse className="h-4 w-40" />
          <Pulse className="h-3 w-24" />
        </div>
        <Pulse className="h-7 w-36 rounded-lg" />
      </div>
      <Pulse className="mt-5 h-3 w-full rounded-full" />
      <div className="mt-3 flex flex-wrap gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Pulse key={i} className="h-3 w-20" />
        ))}
      </div>
      <div className="mt-6 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <Pulse className="h-4 w-32 sm:w-44" />
            <div className="flex gap-4">
              <Pulse className="h-4 w-16" />
              <Pulse className="h-4 w-10" />
              <Pulse className="h-4 w-12" />
            </div>
          </div>
        ))}
      </div>
      <Pulse className="mt-6 h-16 w-full rounded-lg" />
    </PanelShell>
  )
}

export function IncomeSourceArchitecture({
  entries,
  incomeStats,
  loading,
  className,
}: Props) {
  const { formatCurrency } = useFormatCurrency()
  const reducedMotion = usePrefersReducedMotion()
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long" }).format(
    new Date(),
  )

  if (loading) {
    return <IncomeSourceArchitectureSkeleton className={className} />
  }

  const grouped = groupIncomeSources(entries, entries)
  const showSparkline =
    incomeStats.monthlyTotals.length > 0 &&
    (grouped.rows.length > 0 ||
      incomeStats.monthlyTotals.some((t) => t.total > 0))

  return (
    <PanelShell className={className}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
            Source Architecture
          </h3>
          <p className="mt-1 text-xs" style={{ color: TOKENS.onSurfaceMutedElevated }}>
            {monthLabel}
          </p>
        </div>
        <OverallMomChip pct={incomeStats.monthOverMonthPct} />
      </div>

      {grouped.rows.length === 0 ? (
        <p className="mt-5 text-sm" style={{ color: TOKENS.onSurfaceMutedElevated }}>
          No inflows logged this month.
        </p>
      ) : (
        <>
          <div className="mt-5">
            <CompositionBar rows={grouped.rows} reducedMotion={reducedMotion} />
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            {grouped.rows.map((row) => (
              <li
                key={`legend-${row.label}`}
                className="flex min-w-0 max-w-[11rem] items-center gap-2"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ background: row.color }}
                  aria-hidden
                />
                <span
                  className="truncate text-xs"
                  style={{ color: TOKENS.onSurfaceMutedElevated }}
                  title={row.label}
                >
                  {row.label}
                </span>
              </li>
            ))}
          </ul>
          <ul className="mt-6 space-y-3">
            {grouped.rows.map((row) => (
              <li
                key={row.label}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,1.4fr)_minmax(5.5rem,auto)_4.5rem_5.5rem]"
              >
                <p
                  className="truncate text-sm"
                  style={{ color: TOKENS.onSurface }}
                  title={row.label}
                >
                  <span className="sr-only">Source: </span>
                  {row.label}
                </p>
                <p
                  className="justify-self-end text-sm font-medium tabular-nums"
                  style={{ color: TOKENS.onSurface }}
                >
                  <span className="sr-only">Amount: </span>
                  {formatCurrency(row.amount)}
                </p>
                <p
                  className="col-start-1 row-start-2 text-xs tabular-nums sm:col-auto sm:row-auto sm:justify-self-end sm:text-sm"
                  style={{ color: TOKENS.onSurfaceMutedElevated }}
                >
                  <span className="sr-only">Share: </span>
                  {row.sharePct.toFixed(1)}%
                </p>
                <div className="col-start-2 row-start-2 justify-self-end sm:col-auto sm:row-auto">
                  <span className="sr-only">Month over month: </span>
                  <SourceMomCell row={row} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {showSparkline ? (
        <div className="mt-6 border-t pt-5" style={{ borderColor: TOKENS.outlineGhost }}>
          <MonthlySparkline
            totals={incomeStats.monthlyTotals}
            reducedMotion={reducedMotion}
          />
        </div>
      ) : null}
    </PanelShell>
  )
}
