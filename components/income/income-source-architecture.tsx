"use client"

import { useEffect, useState, type ReactNode } from "react"
import { TrendingDown, TrendingUp } from "lucide-react"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import { MomChip } from "@/components/wealth-console/mom-chip"
import {
  type IncomeEntry,
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
      style={{ color: positive ? TOKENS.primary : TOKENS.loss }}
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

const RING_SIZE = 168
const RING_STROKE = 20

function RadialRing({
  rows,
  totalAmount,
  reducedMotion,
}: {
  rows: IncomeSourceRow[]
  totalAmount: string
  reducedMotion: boolean
}) {
  const [revealed, setRevealed] = useState(reducedMotion)
  if (reducedMotion && !revealed) {
    setRevealed(true)
  }
  useEffect(() => {
    if (reducedMotion) return
    const id = requestAnimationFrame(() => setRevealed(true))
    return () => cancelAnimationFrame(id)
  }, [reducedMotion, rows])

  const r = (RING_SIZE - RING_STROKE) / 2
  const center = RING_SIZE / 2
  const circumference = 2 * Math.PI * r

  const visibleRows = rows.filter((row) => row.sharePct > 0)
  const segments = visibleRows.map((row, idx) => ({
    row,
    startPct: visibleRows.slice(0, idx).reduce((sum, r) => sum + r.sharePct, 0),
  }))

  return (
    <div
      className="relative shrink-0"
      style={{ width: RING_SIZE, height: RING_SIZE }}
      role="img"
      aria-label={`Income composition: ${rows
        .map((r) => `${r.label} ${r.sharePct.toFixed(1)}%`)
        .join(", ")}`}
    >
      <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={TOKENS.surfaceHigh}
          strokeWidth={RING_STROKE}
        />
        {segments.map(({ row, startPct }, idx) => {
          const dash = (row.sharePct / 100) * circumference
          return (
            <circle
              key={row.label}
              cx={center}
              cy={center}
              r={r}
              fill="none"
              stroke={row.color}
              strokeWidth={RING_STROKE}
              strokeDasharray={circumference}
              strokeDashoffset={revealed ? circumference - dash : circumference}
              style={{
                transformOrigin: `${center}px ${center}px`,
                transform: `rotate(${-90 + (startPct / 100) * 360}deg)`,
                transition: reducedMotion
                  ? undefined
                  : `stroke-dashoffset 0.7s ease-out ${idx * 70}ms`,
              }}
            />
          )
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span
          className="text-[9px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: TOKENS.onSurfaceMuted }}
        >
          Total
        </span>
        <span
          className="mt-1 text-lg font-bold tabular-nums"
          style={{ color: TOKENS.onSurface }}
        >
          {totalAmount}
        </span>
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
      <div className="mt-5 grid grid-cols-1 items-center gap-6 sm:grid-cols-[168px_1fr] sm:gap-8">
        <Pulse className="mx-auto h-[168px] w-[168px] rounded-full sm:mx-0" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
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
      </div>
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
        <MomChip pct={incomeStats.monthOverMonthPct} />
      </div>

      {grouped.rows.length === 0 ? (
        <p className="mt-5 text-sm" style={{ color: TOKENS.onSurfaceMutedElevated }}>
          No inflows logged this month.
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-1 items-center gap-6 sm:grid-cols-[168px_1fr] sm:gap-8">
          <div className="flex justify-center sm:justify-start">
            <RadialRing
              rows={grouped.rows}
              totalAmount={formatCurrency(grouped.currentTotal)}
              reducedMotion={reducedMotion}
            />
          </div>

          <div>
            <div
              className="hidden text-[10px] font-semibold uppercase tracking-[0.14em] sm:grid sm:grid-cols-[minmax(0,1.4fr)_minmax(5.5rem,auto)_4.5rem_5.5rem] sm:gap-x-3"
              style={{ color: TOKENS.onSurfaceMutedElevated }}
              aria-hidden
            >
              <span>Source</span>
              <span className="justify-self-end">Amount</span>
              <span className="justify-self-end">Share</span>
              <span className="justify-self-end">MoM</span>
            </div>
            <ul className="mt-2 space-y-3 sm:mt-3">
              {grouped.rows.map((row) => (
                <li
                  key={row.label}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,1.4fr)_minmax(5.5rem,auto)_4.5rem_5.5rem]"
                >
                  <p
                    className="flex min-w-0 items-center gap-2 text-sm"
                    style={{ color: TOKENS.onSurface }}
                    title={row.label}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-sm"
                      style={{ background: row.color }}
                      aria-hidden
                    />
                    <span className="sr-only">Source: </span>
                    <span className="truncate">{row.label}</span>
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
          </div>
        </div>
      )}
    </PanelShell>
  )
}
