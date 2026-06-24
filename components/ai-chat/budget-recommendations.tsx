"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Sparkles,
  RefreshCw,
  ArrowRight,
  SlidersHorizontal,
} from "lucide-react"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { cn } from "@/lib/utils"
import { consoleFocus } from "@/components/wealth-console/console-ui"

type Recommendation = {
  pillar: string
  currentPct: number
  suggestedPct: number
  reason: string
}

type BudgetRecommendationData = {
  summary: string
  recommendations: Recommendation[]
}

const PILLAR_LABELS: Record<string, string> = {
  fixedCosts: "Fixed Costs",
  savings: "Savings",
  investment: "Investment",
  guiltFreeSpending: "Guilt-Free",
}

const PILLAR_COLORS: Record<string, string> = {
  fixedCosts: "#60a5fa",
  savings: TOKENS.primary,
  investment: "#a78bfa",
  guiltFreeSpending: "#fbbf24",
}

function RecommendationSkeleton() {
  return (
    <div className="flex items-center gap-4 py-3">
      <div
        className="h-4 w-20 animate-pulse rounded"
        style={{ background: TOKENS.surfaceHigh }}
      />
      <div className="flex flex-1 items-center gap-2">
        <div
          className="h-4 w-10 animate-pulse rounded"
          style={{ background: TOKENS.surfaceHigh }}
        />
        <div
          className="h-3 w-4 animate-pulse rounded"
          style={{ background: TOKENS.surfaceHigh }}
        />
        <div
          className="h-4 w-10 animate-pulse rounded"
          style={{ background: TOKENS.surfaceHigh }}
        />
      </div>
      <div
        className="h-3 w-40 animate-pulse rounded"
        style={{ background: TOKENS.surfaceHigh }}
      />
    </div>
  )
}

export function BudgetRecommendations() {
  const [data, setData] = useState<BudgetRecommendationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetch("/api/ai-budget-recommendations")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error)
        setData(json)
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
      aria-labelledby="budget-rec-heading"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: `#a78bfa20` }}
          >
            <SlidersHorizontal
              className="h-4 w-4"
              style={{ color: "#a78bfa" }}
            />
          </div>
          <div>
            <h2
              id="budget-rec-heading"
              className="text-[15px] font-semibold"
              style={{ color: TOKENS.onSurface }}
            >
              Budget Recommendations
            </h2>
            <p
              className="text-[11px]"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              AI-suggested allocation adjustments
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
          aria-label="Refresh recommendations"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
      </div>

      {loading ? (
        <div
          className="divide-y rounded-xl border px-4"
          style={{
            borderColor: TOKENS.outlineGhost,
            background: TOKENS.surface,
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <RecommendationSkeleton key={i} />
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
      ) : !data?.recommendations?.length ? (
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
            Couldn&apos;t generate recommendations right now.
          </p>
          <button
            type="button"
            onClick={load}
            className={cn(
              "rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors",
              consoleFocus,
            )}
            style={{
              background: `#a78bfa20`,
              color: "#a78bfa",
            }}
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          {data.summary && (
            <div
              className="mb-4 flex items-start gap-2 rounded-xl border px-4 py-3"
              style={{
                borderColor: TOKENS.outlineGhost,
                background: TOKENS.surface,
              }}
            >
              <Sparkles
                className="mt-0.5 h-4 w-4 flex-shrink-0"
                style={{ color: TOKENS.primary }}
              />
              <p
                className="text-[12px] leading-relaxed"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                {data.summary}
              </p>
            </div>
          )}
          <div
            className="divide-y rounded-xl border"
            style={{
              borderColor: TOKENS.outlineGhost,
              background: TOKENS.surface,
            }}
          >
            {data.recommendations.map((rec) => {
              const label = PILLAR_LABELS[rec.pillar] ?? rec.pillar
              const color = PILLAR_COLORS[rec.pillar] ?? TOKENS.primary
              const diff = rec.suggestedPct - rec.currentPct
              const isChange = Math.abs(diff) >= 1

              return (
                <div
                  key={rec.pillar}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3"
                >
                  <p
                    className="w-24 text-[13px] font-semibold"
                    style={{ color }}
                  >
                    {label}
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded-md px-2 py-0.5 text-[13px] font-semibold tabular-nums"
                      style={{
                        background: `${color}15`,
                        color: TOKENS.onSurface,
                      }}
                    >
                      {rec.currentPct}%
                    </span>
                    {isChange && (
                      <>
                        <ArrowRight
                          className="h-3.5 w-3.5"
                          style={{ color: TOKENS.onSurfaceMuted }}
                        />
                        <span
                          className="rounded-md px-2 py-0.5 text-[13px] font-bold tabular-nums"
                          style={{
                            background: `${color}25`,
                            color,
                          }}
                        >
                          {rec.suggestedPct}%
                        </span>
                      </>
                    )}
                    {!isChange && (
                      <span
                        className="text-[11px]"
                        style={{ color: TOKENS.primary }}
                      >
                        No change needed
                      </span>
                    )}
                  </div>
                  <p
                    className="w-full text-[11px] leading-relaxed sm:ml-auto sm:w-auto sm:max-w-[280px] sm:text-right"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    {rec.reason}
                  </p>
                </div>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
