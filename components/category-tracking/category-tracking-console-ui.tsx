"use client"

import { useId } from "react"
import type { LucideIcon } from "lucide-react"
import { Flame, Snowflake, Gauge, Clock, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { TOKENS, CARD_INSET } from "@/lib/wealth-console-tokens"
import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "@/lib/income-page-types"
import { consoleFocus } from "@/components/wealth-console/console-ui"
import {
  TRACKING_FUND_CATEGORIES,
  type TrackingFundKey,
} from "@/lib/category-tracking-shared"

export const CATEGORY_TRACKING_PERIOD_ID = "ct-tracking-period"

export const categoryTrackingConsoleField = cn(
  "mt-1 w-full rounded-xl border px-3 py-2.5 text-sm tabular-nums transition-[box-shadow] [color-scheme:dark]",
  consoleFocus,
)

export function pillarSegmentColor(key: TrackingFundKey) {
  return TRACKING_FUND_CATEGORIES.find((c) => c.key === key)?.colorHex ?? TOKENS.primary
}

export function CategoryTrackingBarProgress({
  percent,
  color,
  label,
}: {
  percent: number
  color: string
  label: string
}) {
  const value = Math.round(Math.min(100, Math.max(0, percent)))
  const labelId = useId()

  return (
    <>
      <span id={labelId} className="sr-only">
        {label}
      </span>
      <div
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-1.5 h-2 w-full overflow-hidden rounded-full"
        style={{ background: TOKENS.surfaceHigh }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${value}%`,
            background: color,
            boxShadow: CARD_INSET,
          }}
        />
      </div>
    </>
  )
}

export function CategoryTrackingSegmentedBlocks({
  percent,
  activeColor,
  label,
}: {
  percent: number
  activeColor: string
  label: string
}) {
  const blocks = 14
  const value = Math.round(Math.min(100, Math.max(0, percent)))
  const filled = Math.max(0, Math.min(blocks, Math.round((value / 100) * blocks)))
  const labelId = useId()

  return (
    <>
      <span id={labelId} className="sr-only">
        {label}
      </span>
      <div
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-3 flex gap-1"
      >
        {Array.from({ length: blocks }).map((_, i) => (
          <span
            key={i}
            className="h-2 w-3 rounded-[4px]"
            style={{
              background:
                i < filled
                  ? activeColor
                  : `color-mix(in srgb, ${TOKENS.onSurfaceMuted} 22%, ${TOKENS.surfaceLow})`,
              boxShadow: i < filled ? CARD_INSET : undefined,
              opacity: i < filled ? 1 : 0.55,
            }}
          />
        ))}
      </div>
    </>
  )
}

/**
 * Pace = usage% vs elapsed-month%. "Hot" means spend is outrunning the
 * calendar; "Cool" means it's lagging; "Balanced" is within +/-15%.
 */
export type CategoryPaceState = "future" | "closed" | "hot" | "cool" | "balanced"

export function computeCategoryPace(
  usagePercent: number,
  elapsed: number
): { state: CategoryPaceState; label: string } {
  if (elapsed <= 0) return { state: "future", label: "Future" }
  if (elapsed >= 1) return { state: "closed", label: "Closed" }
  const ratio = usagePercent / (elapsed * 100)
  if (ratio > 1.15) return { state: "hot", label: "Hot" }
  if (ratio < 0.85) return { state: "cool", label: "Cool" }
  return { state: "balanced", label: "Balanced" }
}

export const CATEGORY_PACE_META: Record<CategoryPaceState, { Icon: LucideIcon; color: string }> = {
  future: { Icon: Clock, color: TOKENS.onSurfaceMuted },
  closed: { Icon: CheckCircle2, color: TOKENS.onSurfaceMuted },
  hot: { Icon: Flame, color: ERROR_SOFT },
  cool: { Icon: Snowflake, color: TOKENS.secondary },
  balanced: { Icon: Gauge, color: TOKENS.primary },
}

/** Single-scale progress bar with a tick marking how far the month has elapsed. */
export function CategoryTrackingPaceBar({
  usagePercent,
  elapsed,
  color,
  label,
}: {
  usagePercent: number
  elapsed: number
  color: string
  label: string
}) {
  const fillPct = Math.max(0, Math.min(100, usagePercent))
  const markerPct = Math.max(0, Math.min(100, elapsed * 100))
  const showMarker = elapsed > 0 && elapsed < 1
  const labelId = useId()

  return (
    <>
      <span id={labelId} className="sr-only">
        {label}
      </span>
      <div
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuenow={Math.round(fillPct)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="relative h-2 w-full rounded-full"
        style={{ background: TOKENS.surfaceHigh }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${fillPct}%`, background: color, boxShadow: CARD_INSET }}
        />
        {showMarker && (
          <span
            className="absolute top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-full"
            style={{ left: `calc(${markerPct}% - 1px)`, background: TOKENS.onSurface, opacity: 0.55 }}
            aria-hidden
          />
        )}
      </div>
    </>
  )
}

/** Tiny bar-chart of the last N months for one pillar; last bar is the current month. */
export function CategoryTrackingSparkline({
  values,
  color,
  currentIndex,
}: {
  values: number[]
  color: string
  currentIndex: number
}) {
  if (values.length === 0) return null
  const width = 64
  const height = 22
  const gap = 3
  const barWidth = (width - gap * (values.length - 1)) / values.length
  const max = Math.max(1, ...values)

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0"
      aria-hidden
      focusable="false"
    >
      {values.map((v, i) => {
        const h = Math.max(2, (v / max) * height)
        const x = i * (barWidth + gap)
        const y = height - h
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={h}
            rx={1.5}
            fill={color}
            opacity={i === currentIndex ? 1 : 0.32}
          />
        )
      })}
    </svg>
  )
}
