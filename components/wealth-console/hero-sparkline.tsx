"use client"

import { useId } from "react"
import { useLineDrawAnimation } from "@/hooks/use-line-draw"
import { computeSparklinePoints } from "@/lib/sparkline"
import { TOKENS } from "@/lib/wealth-console-tokens"

/**
 * Compact 6-month trend line for a hero figure (e.g. under a YTD total).
 * Ends on a marker for the current period and, when `formatValue` is
 * supplied, labels the high/low of the window so the line reads as data
 * rather than decoration.
 */
export function HeroSparkline({
  values,
  reducedMotion,
  color = TOKENS.primary,
  formatValue,
  ariaLabel = "Six-month trend",
  className = "h-8 w-[110px] shrink-0 overflow-visible",
}: {
  values: number[]
  reducedMotion: boolean
  /** Series tint; pass the same variant color as the hero figure it trails (e.g. TOKENS.loss for spend). */
  color?: string
  formatValue?: (value: number) => string
  ariaLabel?: string
  className?: string
}) {
  const w = 110
  const h = 32
  const gradientId = useId()
  const animate = !reducedMotion && values.length >= 2
  const lineRef = useLineDrawAnimation<SVGPolylineElement>(animate)
  if (values.length < 2) return null
  const points = computeSparklinePoints(values, w, h, 4)
  const lastPoint = points.split(" ").at(-1)!
  const [lastX, lastY] = lastPoint.split(",").map(Number)
  const areaPoints = `0,${h} ${points} ${w},${h}`
  const max = Math.max(...values)
  const min = Math.min(...values)

  return (
    <div className="mt-4 flex items-center gap-3">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className={className}
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill={`url(#${gradientId})`} />
        <polyline
          ref={animate ? lineRef : undefined}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={animate ? 100 : undefined}
          strokeDasharray={animate ? 100 : undefined}
          points={points}
        />
        <circle cx={lastX} cy={lastY} r="4" fill={color} stroke={TOKENS.surface} strokeWidth="2" />
      </svg>
      {formatValue ? (
        <dl className="flex flex-col gap-1 text-[10px] leading-none font-semibold tabular-nums">
          <div className="flex items-center gap-1.5">
            <dt className="uppercase tracking-wide" style={{ color: TOKENS.onSurfaceMuted }}>
              High
            </dt>
            <dd style={{ color: TOKENS.onSurface }}>{formatValue(max)}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="uppercase tracking-wide" style={{ color: TOKENS.onSurfaceMuted }}>
              Low
            </dt>
            <dd style={{ color: TOKENS.onSurface }}>{formatValue(min)}</dd>
          </div>
        </dl>
      ) : null}
    </div>
  )
}
