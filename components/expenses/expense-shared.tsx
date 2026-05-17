"use client"

import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { FUND_CATEGORIES, EXPENSE_CATEGORIES } from "@/lib/expense-page-constants"

export function fundLabel(v: string | null) {
  if (!v) return ""
  return FUND_CATEGORIES.find((c) => c.value === v)?.label ?? v
}

export function expenseLabel(v: string | null) {
  if (!v) return ""
  return EXPENSE_CATEGORIES.find((c) => c.value === v)?.label ?? v
}

export function pctOf(total: number, part: number) {
  if (total <= 0) return 0
  return (part / total) * 100
}

export function SegmentedBlocks({
  percent,
  activeColor,
}: {
  percent: number
  activeColor: string
}) {
  const blocks = 14
  const filled = Math.max(0, Math.min(blocks, Math.round((percent / 100) * blocks)))
  return (
    <div className="mt-3 flex gap-1">
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
  )
}
