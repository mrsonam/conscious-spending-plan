"use client"

import { useEffect, useState } from "react"
import { TOKENS } from "@/lib/wealth-console-tokens"

export type RadialRingSegment = {
  key: string
  sharePct: number
  color: string
}

/**
 * Animated donut/ring composition chart. Each segment sweeps out clockwise
 * from its own starting angle on reveal (stroke-dashoffset only, per-segment
 * rotation) — reduced-motion renders fully drawn with no transition.
 */
export function RadialRing({
  segments,
  totalAmount,
  totalLabel = "Total",
  reducedMotion,
  ariaLabel,
  size = 168,
  strokeWidth = 20,
  selectedKey,
  onSelectKey,
}: {
  segments: RadialRingSegment[]
  totalAmount: string
  totalLabel?: string
  reducedMotion: boolean
  ariaLabel: string
  size?: number
  strokeWidth?: number
  /** Optional mouse-selectable segment (e.g. spotlighting a category). Dims the rest. */
  selectedKey?: string | null
  onSelectKey?: (key: string) => void
}) {
  const [revealed, setRevealed] = useState(reducedMotion)
  if (reducedMotion && !revealed) {
    setRevealed(true)
  }
  useEffect(() => {
    if (reducedMotion) return
    const id = requestAnimationFrame(() => setRevealed(true))
    return () => cancelAnimationFrame(id)
  }, [reducedMotion, segments])

  const r = (size - strokeWidth) / 2
  const center = size / 2
  const circumference = 2 * Math.PI * r

  const visibleSegments = segments.filter((segment) => segment.sharePct > 0)
  const positioned = visibleSegments.map((segment, idx) => ({
    segment,
    startPct: visibleSegments.slice(0, idx).reduce((sum, s) => sum + s.sharePct, 0),
  }))

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={ariaLabel}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={TOKENS.surfaceHigh}
          strokeWidth={strokeWidth}
        />
        {positioned.map(({ segment, startPct }, idx) => {
          const dash = (segment.sharePct / 100) * circumference
          const dimmed = selectedKey != null && selectedKey !== segment.key
          return (
            <circle
              key={segment.key}
              cx={center}
              cy={center}
              r={r}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={revealed ? circumference - dash : circumference}
              onClick={onSelectKey ? () => onSelectKey(segment.key) : undefined}
              style={{
                transformOrigin: `${center}px ${center}px`,
                transform: `rotate(${-90 + (startPct / 100) * 360}deg)`,
                opacity: dimmed ? 0.35 : 1,
                cursor: onSelectKey ? "pointer" : undefined,
                transition: reducedMotion
                  ? undefined
                  : `stroke-dashoffset 0.7s ease-out ${idx * 70}ms, opacity 0.2s ease`,
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
          {totalLabel}
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
