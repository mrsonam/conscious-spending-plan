"use client"

import { useId } from "react"
import { cn } from "@/lib/utils"
import { TOKENS, CARD_INSET } from "@/lib/wealth-console-tokens"
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
