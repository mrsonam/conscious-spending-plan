"use client"

import { Sparkles } from "lucide-react"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { consoleMicroLabel } from "@/components/wealth-console/console-ui"
import { cn } from "@/lib/utils"
import type { DashboardInsight } from "@/components/wealth-console/dashboard-utils"

const TONE_COLOR: Record<DashboardInsight["tone"], string> = {
  positive: TOKENS.primary,
  caution: TOKENS.warning,
  neutral: TOKENS.secondary,
}

/**
 * Fills the leftover height at the bottom of the metrics band with one
 * rules-based observation. Renders a quiet placeholder while loading and
 * keeps the slot (blank tile) when no insight qualifies, so the band's
 * bento silhouette stays intact.
 */
export function ConsoleInsightTile({
  insight,
  loading,
  className,
}: {
  insight: DashboardInsight | null
  loading: boolean
  className?: string
}) {
  const accent = insight ? TONE_COLOR[insight.tone] : TOKENS.secondary

  return (
    <div
      className={cn("flex min-h-[72px] items-center rounded-xl p-5 sm:p-6", className)}
      style={{ background: TOKENS.surfaceLow, boxShadow: CARD_INSET }}
    >
      {loading && !insight ? (
        <div className="flex w-full items-center gap-3" aria-hidden>
          <div
            className="h-8 w-8 shrink-0 animate-pulse rounded-lg"
            style={{ background: TOKENS.surfaceContainer }}
          />
          <div className="min-w-0 flex-1 space-y-2">
            <div
              className="h-3 w-16 animate-pulse rounded"
              style={{ background: TOKENS.surfaceContainer }}
            />
            <div
              className="h-4 w-4/5 animate-pulse rounded"
              style={{ background: TOKENS.surfaceContainer }}
            />
          </div>
        </div>
      ) : insight ? (
        <div className="flex w-full items-center gap-3">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ background: TOKENS.surfaceContainer, color: accent }}
          >
            <Sparkles className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.22em]"
              style={consoleMicroLabel}
            >
              Insight
            </p>
            <p
              className="mt-1 text-sm leading-relaxed"
              style={{ color: TOKENS.onSurface }}
            >
              {insight.text}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
