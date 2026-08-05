"use client"

import { useCallback, useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { consoleMicroLabel } from "@/components/wealth-console/console-ui"
import { cn } from "@/lib/utils"
import type { DashboardInsight } from "@/components/wealth-console/dashboard-utils"

const TONE_COLOR: Record<DashboardInsight["tone"], string> = {
  positive: TOKENS.primary,
  caution: TOKENS.warning,
  neutral: TOKENS.secondary,
}

/** Auto-advance interval for insight rotation. */
const ROTATE_MS = 8_000

/**
 * Fills the leftover height at the bottom of the metrics band with rules-based
 * observations. When multiple insights qualify, cycles through them on a timer
 * and with prev/next controls so every one-liner is reachable.
 */
export function ConsoleInsightTile({
  insights,
  loading,
  className,
}: {
  insights: DashboardInsight[]
  loading: boolean
  className?: string
}) {
  const count = insights.length
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [direction, setDirection] = useState<"next" | "prev">("next")

  // Clamp index when the insight list shrinks (e.g. data refresh).
  useEffect(() => {
    if (count === 0) {
      setIndex(0)
      return
    }
    setIndex((i) => (i >= count ? 0 : i))
  }, [count])

  const goPrev = useCallback(() => {
    if (count <= 1) return
    setDirection("prev")
    setIndex((i) => (i - 1 + count) % count)
  }, [count])

  const goNext = useCallback(() => {
    if (count <= 1) return
    setDirection("next")
    setIndex((i) => (i + 1) % count)
  }, [count])

  useEffect(() => {
    if (count <= 1 || paused) return
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }
    const id = window.setInterval(goNext, ROTATE_MS)
    return () => window.clearInterval(id)
  }, [count, paused, goNext])

  const insight = count > 0 ? insights[index] : null
  const accent = insight ? TONE_COLOR[insight.tone] : TOKENS.secondary
  const canRotate = count > 1

  return (
    <div
      className={cn("flex min-h-[72px] items-center rounded-xl p-5 sm:p-6", className)}
      style={{ background: TOKENS.surfaceLow, boxShadow: CARD_INSET }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false)
        }
      }}
    >
      {loading && count === 0 ? (
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
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                style={consoleMicroLabel}
              >
                Insight
                {canRotate ? (
                  <span className="ml-2 font-medium normal-case tracking-normal tabular-nums opacity-80">
                    {index + 1} of {count}
                  </span>
                ) : null}
              </p>
              {canRotate ? (
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={goPrev}
                    aria-label="Previous insight"
                    className="flex h-7 w-7 items-center justify-center rounded-md transition-[background-color,transform] duration-150 hover:bg-white/6 active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4edea3]/45"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    aria-label="Next insight"
                    className="flex h-7 w-7 items-center justify-center rounded-md transition-[background-color,transform] duration-150 hover:bg-white/6 active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4edea3]/45"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              ) : null}
            </div>
            <p
              key={index}
              className="console-insight-slide-in mt-1 text-sm leading-relaxed"
              style={{
                color: TOKENS.onSurface,
                ["--console-insight-slide-x" as string]:
                  direction === "next" ? "10px" : "-10px",
              }}
              aria-live="polite"
            >
              {insight.text}
            </p>
            {canRotate ? (
              <div
                className="mt-2.5 flex items-center gap-1.5"
                role="tablist"
                aria-label="Insight pages"
              >
                {insights.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    role="tab"
                    aria-selected={i === index}
                    aria-label={`Insight ${i + 1}`}
                    onClick={() => {
                      setDirection(i >= index ? "next" : "prev")
                      setIndex(i)
                    }}
                    className="h-1.5 rounded-full transition-[width,background-color] duration-200"
                    style={{
                      width: i === index ? "1rem" : "0.375rem",
                      background:
                        i === index
                          ? accent
                          : `color-mix(in srgb, ${TOKENS.onSurfaceMuted} 45%, transparent)`,
                    }}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
