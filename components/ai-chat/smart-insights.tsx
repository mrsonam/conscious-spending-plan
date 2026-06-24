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
import { consoleFocus } from "@/components/wealth-console/console-ui"

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

function InsightSkeleton() {
  return (
    <div
      className="rounded-xl border px-4 py-3.5"
      style={{
        borderColor: TOKENS.outlineGhost,
        background: TOKENS.surface,
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

export function SmartInsights() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetch("/api/ai-insights")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error)
        setInsights(json.insights ?? [])
      })
      .catch((e) => setError(e.message ?? "Failed to load"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <section
      className="rounded-2xl border p-5 sm:p-6"
      style={{
        background: TOKENS.surfaceContainer,
        borderColor: TOKENS.outlineGhost,
        boxShadow: CARD_INSET,
      }}
      aria-labelledby="smart-insights-heading"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: `${TOKENS.primary}20` }}
          >
            <Sparkles className="h-4 w-4" style={{ color: TOKENS.primary }} />
          </div>
          <div>
            <h2
              id="smart-insights-heading"
              className="text-[15px] font-semibold"
              style={{ color: TOKENS.onSurface }}
            >
              Smart Insights
            </h2>
            <p
              className="text-[11px]"
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
            "rounded-lg p-2 transition-colors disabled:opacity-40",
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
            <InsightSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div
          className="flex h-24 items-center justify-center rounded-xl text-[13px]"
          style={{
            background: TOKENS.surface,
            color: TOKENS.onSurfaceMuted,
          }}
        >
          {error}
        </div>
      ) : insights.length === 0 ? (
        <div
          className="flex items-center justify-center gap-3 rounded-xl border px-4 py-4"
          style={{
            borderColor: TOKENS.outlineGhost,
            background: TOKENS.surface,
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
              "rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors",
              consoleFocus,
            )}
            style={{
              background: `${TOKENS.primary}20`,
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
                className="rounded-xl border px-4 py-3.5 transition-colors"
                style={{
                  borderColor: TOKENS.outlineGhost,
                  background: TOKENS.surface,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{ background: `${color}18` }}
                  >
                    <Icon
                      className="h-3.5 w-3.5"
                      style={{ color }}
                    />
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
