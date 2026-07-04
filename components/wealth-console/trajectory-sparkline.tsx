import { TOKENS } from "@/lib/wealth-console-tokens"
import type { TrajectoryPoint } from "@/components/wealth-console/types"

export function TrajectorySparkline({ series }: { series: TrajectoryPoint[] }) {
  const w = 140
  const h = 44
  const pad = 2
  const values = series.map((s) => s.value)
  if (values.length < 2) {
    return (
      <div
        className="flex h-11 w-[140px] items-end justify-between gap-0.5 opacity-40"
        aria-hidden
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="w-1 rounded-sm"
            style={{
              height: `${20 + (i % 3) * 8}%`,
              background: TOKENS.primary,
            }}
          />
        ))}
      </div>
    )
  }
  const min = Math.min(...values)
  const max = Math.max(...values, min + 1)
  const points = values.map((v, i) => {
    const x = pad + (i / Math.max(values.length - 1, 1)) * (w - pad * 2)
    const y = pad + (1 - (v - min) / (max - min)) * (h - pad * 2)
    return `${x},${y}`
  })
  return (
    <svg width={w} height={h} className="shrink-0 overflow-visible" aria-hidden>
      <polyline
        fill="none"
        stroke={TOKENS.primary}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={100}
        className="csp-line-draw"
        points={points.join(" ")}
      />
    </svg>
  )
}
