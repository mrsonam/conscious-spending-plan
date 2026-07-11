"use client"

import { TrendingDown, TrendingUp } from "lucide-react"
import { TOKENS } from "@/lib/wealth-console-tokens"

/**
 * Compact per-row momentum indicator (e.g. a source/category's % change vs
 * last month). `positiveIsGood` mirrors MomChip's polarity control.
 */
export function MomentumCell({
  pct,
  isNew,
  positiveIsGood = true,
  className,
}: {
  pct: number | null
  isNew: boolean
  positiveIsGood?: boolean
  className?: string
}) {
  if (isNew || pct === null) {
    return (
      <span
        className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${className ?? ""}`}
        style={{ color: TOKENS.secondary }}
      >
        new
      </span>
    )
  }
  const positive = pct >= 0
  const good = positive === positiveIsGood
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium tabular-nums ${className ?? ""}`}
      style={{ color: good ? TOKENS.primary : TOKENS.loss }}
    >
      {positive ? (
        <TrendingUp className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
      ) : (
        <TrendingDown className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
      )}
      {positive ? "+" : ""}
      {pct.toFixed(1)}%
    </span>
  )
}
