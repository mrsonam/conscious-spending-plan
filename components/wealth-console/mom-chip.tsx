"use client"

import { TrendingDown, TrendingUp } from "lucide-react"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"

/** Month-over-month % chip used on hero figures and Source Architecture. */
export function MomChip({ pct, className }: { pct: number | null; className?: string }) {
  const positive = pct !== null && pct >= 0
  const tone =
    pct === null ? TOKENS.onSurfaceMuted : positive ? TOKENS.primary : TOKENS.loss

  return (
    <div
      className={`inline-flex items-center rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${className ?? ""}`}
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
