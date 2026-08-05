"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Info,
  RefreshCw,
} from "lucide-react"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { cn } from "@/lib/utils"
import { consoleFocus, consoleMicroLabel } from "@/components/wealth-console/console-ui"
import type { ConsoleCardTone } from "@/components/wealth-console/sections/console-subscriptions-card"

type Insight = {
  type: "warning" | "positive" | "tip" | "info"
  title: string
  body: string
}

const ICON_MAP = {
  warning: TrendingDown,
  positive: TrendingUp,
  tip: Lightbulb,
  info: Info,
} as const

const COLOR_MAP = {
  warning: "#f87171",
  positive: TOKENS.primary,
  tip: "#fbbf24",
  info: "#60a5fa",
} as const

function InsightSkeleton({ chipBg }: { chipBg: string }) {
  return (
    <div
      className="rounded-xl px-4 py-3.5"
      style={{
        background: chipBg,
        boxShadow: CARD_INSET,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 h-5 w-5 animate-pulse rounded"
          style={{ background: TOKENS.surfaceHigh }}
        />
        <div className="flex-1">
          <div
            className="mb-2 h-3.5 w-32 animate-pulse rounded"
            style={{ background: TOKENS.surfaceHigh }}
          />
          <div
            className="h-3 w-full animate-pulse rounded"
            style={{ background: TOKENS.surfaceHigh }}
          />
          <div
            className="mt-1.5 h-3 w-3/4 animate-pulse rounded"
            style={{ background: TOKENS.surfaceHigh }}
          />
        </div>
      </div>
    </div>
  )
}

export function SmartInsights({
  tone = "raised",
  className,
}: {
  tone?: ConsoleCardTone
  className?: string
}) {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const recessed = tone === "recessed"
  const cardBg = recessed ? TOKENS.surfaceLow : TOKENS.surfaceContainer
  const chipBg = recessed ? TOKENS.surfaceContainer : TOKENS.surfaceLow

  const fetchInsights = useCallback(() => {
    fetch("/api/ai-insights")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error)
        setInsights(json.insights ?? [])
      })
      .catch((e) => setError(e.message ?? "Failed to load"))
      .finally(() => setLoading(false))
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchInsights()
  }, [fetchInsights])

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  return (
    <section
      className={cn("rounded-xl p-5 sm:p-6", className)}
      style={{
        background: cardBg,
        boxShadow: CARD_INSET,
      }}
      aria-labelledby="smart-insights-heading"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ background: chipBg, color: TOKENS.primary }}
          >
            <Sparkles className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2
              id="smart-insights-heading"
              className="text-[10px] font-semibold uppercase tracking-[0.22em]"
              style={consoleMicroLabel}
            >
              Smart Insights
            </h2>
            <p
              className="mt-1 text-xs leading-relaxed"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              AI-powered analysis of your finances
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className={cn(
            "rounded-lg p-2 transition-[background-color,transform] duration-150 active:scale-90 disabled:opacity-40 disabled:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100",
            consoleFocus,
          )}
          style={{ color: TOKENS.onSurfaceMuted }}
          aria-label="Refresh insights"
        >
          <RefreshCw
            className={cn("h-4 w-4", loading && "animate-spin")}
          />
        </button>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <InsightSkeleton key={i} chipBg={chipBg} />
          ))}
        </div>
      ) : error ? (
        <div
          className="flex h-24 items-center justify-center rounded-xl text-[13px]"
          style={{
            background: chipBg,
            color: TOKENS.onSurfaceMuted,
          }}
        >
          {error}
        </div>
      ) : insights.length === 0 ? (
        <div
          className="flex items-center justify-center gap-3 rounded-xl px-4 py-4"
          style={{
            background: chipBg,
            boxShadow: CARD_INSET,
          }}
        >
          <p
            className="text-[13px]"
            style={{ color: TOKENS.onSurfaceMuted }}
          >
            Couldn&apos;t generate insights right now.
          </p>
          <button
            type="button"
            onClick={load}
            className={cn(
              "rounded-lg px-3 py-1.5 text-[12px] font-medium transition-[background-color,transform] duration-150 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100",
              consoleFocus,
            )}
            style={{
              background: `color-mix(in srgb, ${TOKENS.primary} 16%, transparent)`,
              color: TOKENS.primary,
            }}
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {insights.map((insight, i) => {
            const Icon = ICON_MAP[insight.type] ?? Info
            const color = COLOR_MAP[insight.type] ?? COLOR_MAP.info

            return (
              <div
                key={i}
                className="rounded-xl px-4 py-3.5"
                style={{
                  background: chipBg,
                  boxShadow: CARD_INSET,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      background: `color-mix(in srgb, ${color} 16%, ${cardBg})`,
                      color,
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-[13px] font-semibold leading-tight"
                      style={{ color: TOKENS.onSurface }}
                    >
                      {insight.title}
                    </p>
                    <p
                      className="mt-1 text-[12px] leading-relaxed"
                      style={{ color: TOKENS.onSurfaceMuted }}
                    >
                      {insight.body}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
