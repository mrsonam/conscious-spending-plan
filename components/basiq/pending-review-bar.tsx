"use client"

import { AlertCircle } from "lucide-react"
import { TOKENS } from "@/lib/wealth-console-tokens"

type PendingReviewBarProps = {
  count: number
  onClick: () => void
}

export function PendingReviewBar({ count, onClick }: PendingReviewBarProps) {
  if (count === 0) return null

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 border-b px-4 py-2 text-xs font-medium transition-colors hover:opacity-90"
      style={{
        background: `color-mix(in srgb, ${TOKENS.primary} 12%, ${TOKENS.surfaceContainer})`,
        borderColor: TOKENS.outlineGhost,
        color: TOKENS.primary,
      }}
    >
      <AlertCircle className="h-3.5 w-3.5" />
      {count} new transaction{count !== 1 ? "s" : ""} to review
    </button>
  )
}
