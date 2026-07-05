"use client"

import { Sparkles } from "lucide-react"
import { TOKENS } from "@/lib/wealth-console-tokens"
import type { TrendsInsight } from "@/hooks/use-trends-report"

const TONE_COLOR: Record<TrendsInsight["tone"], string> = {
  positive: TOKENS.primary,
  caution: TOKENS.warning,
  neutral: TOKENS.secondary,
}

/** Rules-based observations for the selected period, one chip each. */
export function TrendsInsightStrip({
  insights,
  loading,
}: {
  insights: TrendsInsight[]
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="flex flex-wrap gap-2" aria-hidden>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-56 max-w-full animate-pulse rounded-full"
            style={{ background: TOKENS.surfaceLow }}
          />
        ))}
      </div>
    )
  }

  if (insights.length === 0) return null

  return (
    <ul className="flex flex-wrap gap-2">
      {insights.map((insight) => (
        <li
          key={insight.text}
          className="inline-flex items-center gap-1.5 rounded-full py-1.5 pl-2 pr-3 text-[12px] leading-snug"
          style={{ background: TOKENS.surfaceLow, color: TOKENS.onSurface }}
        >
          <Sparkles
            className="h-3.5 w-3.5 shrink-0"
            style={{ color: TONE_COLOR[insight.tone] }}
            aria-hidden
          />
          {insight.text}
        </li>
      ))}
    </ul>
  )
}
