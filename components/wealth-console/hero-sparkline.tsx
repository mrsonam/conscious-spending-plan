"use client"

import { useLineDrawAnimation } from "@/hooks/use-line-draw"
import { computeSparklinePoints } from "@/lib/sparkline"
import { TOKENS } from "@/lib/wealth-console-tokens"

/** Compact 6-month trend line for a hero figure (e.g. under a YTD total). */
export function HeroSparkline({
  values,
  reducedMotion,
  ariaLabel = "Six-month trend",
  className = "mt-4 h-8 w-[110px] shrink-0 overflow-visible",
}: {
  values: number[]
  reducedMotion: boolean
  ariaLabel?: string
  className?: string
}) {
  const w = 110
  const h = 32
  const animate = !reducedMotion && values.length >= 2
  const lineRef = useLineDrawAnimation<SVGPolylineElement>(animate)
  if (values.length < 2) return null
  const points = computeSparklinePoints(values, w, h, 4)

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      role="img"
      aria-label={ariaLabel}
    >
      <polyline
        ref={animate ? lineRef : undefined}
        fill="none"
        stroke={TOKENS.primary}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={animate ? 100 : undefined}
        strokeDasharray={animate ? 100 : undefined}
        points={points}
      />
    </svg>
  )
}
