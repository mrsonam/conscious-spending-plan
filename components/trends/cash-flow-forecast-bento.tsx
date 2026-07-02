"use client"

import { useState, useEffect, useCallback } from "react"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import {
  CashFlowForecastChart,
  type TimelinePoint,
} from "./cash-flow-forecast-chart"

const RANGE_OPTIONS = [
  { label: "30 days", value: 30 },
  { label: "60 days", value: 60 },
  { label: "90 days", value: 90 },
]

type ForecastSummary = {
  avgMonthlyIncome: number
  avgDailyExpenses: number
  recurringMonthly: number
}

export function CashFlowForecastBento() {
  const { formatCurrency } = useFormatCurrency()
  const [days, setDays] = useState(60)
  const [timeline, setTimeline] = useState<TimelinePoint[] | null>(null)
  const [todayIndex, setTodayIndex] = useState(0)
  const [currentBalance, setCurrentBalance] = useState(0)
  const [summary, setSummary] = useState<ForecastSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchForecast = useCallback((d: number) => {
    fetch(`/api/cash-flow-forecast?days=${d}&lookback=${d}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error)
        setTimeline(json.timeline)
        setTodayIndex(json.todayIndex)
        setCurrentBalance(json.currentBalance)
        setSummary(json.summary)
      })
      .catch((e) => setError(e.message ?? "Failed to load"))
      .finally(() => setLoading(false))
  }, [])

  // Range change comes from a click handler, so sync setState is fine there.
  const changeDays = useCallback((d: number) => {
    setDays(d)
    setLoading(true)
    setError(null)
  }, [])

  useEffect(() => {
    // State already initializes to (or was reset to) loading — fetch only.
    fetchForecast(days)
  }, [days, fetchForecast])

  const endForecast =
    timeline?.[timeline.length - 1]?.forecastBalance ?? 0
  const balanceChange = endForecast - currentBalance

  return (
    <div
      className="rounded-2xl border p-5 sm:p-6"
      style={{
        background: TOKENS.surfaceContainer,
        borderColor: TOKENS.outlineGhost,
        boxShadow: CARD_INSET,
      }}
    >
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            className="text-[15px] font-semibold"
            style={{ color: TOKENS.onSurface }}
          >
            Cash flow forecast
          </h2>
          <p
            className="mt-0.5 text-[12px]"
            style={{ color: TOKENS.onSurfaceMuted }}
          >
            Forecast vs actual — see how predictions compare to real spending
          </p>
        </div>
        <div
          className="flex rounded-xl border p-0.5"
          style={{
            borderColor: TOKENS.outlineGhost,
            background: TOKENS.surface,
          }}
        >
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => changeDays(opt.value)}
              className="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors"
              style={{
                background:
                  days === opt.value ? TOKENS.surfaceHigh : "transparent",
                color:
                  days === opt.value
                    ? TOKENS.onSurface
                    : TOKENS.onSurfaceMuted,
                boxShadow: days === opt.value ? CARD_INSET : "none",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      {!loading && summary && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div
            className="rounded-xl border px-3 py-2.5"
            style={{
              borderColor: TOKENS.outlineGhost,
              background: TOKENS.surface,
            }}
          >
            <p
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Current
            </p>
            <p
              className="mt-0.5 text-[16px] font-semibold tabular-nums"
              style={{ color: TOKENS.primary }}
            >
              {formatCurrency(currentBalance)}
            </p>
          </div>
          <div
            className="rounded-xl border px-3 py-2.5"
            style={{
              borderColor: TOKENS.outlineGhost,
              background: TOKENS.surface,
            }}
          >
            <p
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              In {days} days
            </p>
            <p
              className="mt-0.5 text-[16px] font-semibold tabular-nums"
              style={{
                color: endForecast >= 0 ? TOKENS.primary : TOKENS.loss,
              }}
            >
              {formatCurrency(endForecast)}
            </p>
          </div>
          <div
            className="rounded-xl border px-3 py-2.5"
            style={{
              borderColor: TOKENS.outlineGhost,
              background: TOKENS.surface,
            }}
          >
            <p
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Change
            </p>
            <p
              className="mt-0.5 text-[16px] font-semibold tabular-nums"
              style={{
                color: balanceChange >= 0 ? TOKENS.primary : TOKENS.loss,
              }}
            >
              {balanceChange >= 0 ? "+" : ""}
              {formatCurrency(balanceChange)}
            </p>
          </div>
          <div
            className="rounded-xl border px-3 py-2.5"
            style={{
              borderColor: TOKENS.outlineGhost,
              background: TOKENS.surface,
            }}
          >
            <p
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Monthly spend
            </p>
            <p
              className="mt-0.5 text-[16px] font-semibold tabular-nums"
              style={{ color: TOKENS.loss }}
            >
              {formatCurrency(
                summary.recurringMonthly + summary.avgDailyExpenses * 30,
              )}
            </p>
          </div>
        </div>
      )}

      {/* Chart area */}
      {loading ? (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border px-3 py-2.5"
                style={{
                  borderColor: TOKENS.outlineGhost,
                  background: TOKENS.surface,
                }}
              >
                <div
                  className="mb-2 h-3 w-16 animate-pulse rounded"
                  style={{ background: TOKENS.surfaceHigh }}
                />
                <div
                  className="h-5 w-24 animate-pulse rounded"
                  style={{ background: TOKENS.surfaceHigh }}
                />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1 px-2" style={{ height: 340 }}>
            <div className="mt-auto flex items-end gap-1">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse flex-1 rounded-t"
                  style={{
                    height: `${60 + Math.sin(i * 0.5) * 40 + Math.cos(i * 0.3) * 20}px`,
                    background: TOKENS.surfaceHigh,
                    animationDelay: `${i * 50}ms`,
                  }}
                />
              ))}
            </div>
          </div>
        </>
      ) : error ? (
        <div
          className="flex h-[340px] items-center justify-center rounded-xl text-[13px]"
          style={{
            background: TOKENS.surface,
            color: TOKENS.onSurfaceMuted,
          }}
        >
          {error}
        </div>
      ) : timeline && timeline.length > 0 ? (
        <CashFlowForecastChart
          data={timeline}
          todayIndex={todayIndex}
          formatCurrency={formatCurrency}
        />
      ) : (
        <div
          className="flex h-[340px] items-center justify-center rounded-xl text-[13px]"
          style={{
            background: TOKENS.surface,
            color: TOKENS.onSurfaceMuted,
          }}
        >
          Not enough data to forecast. Log some income and expenses first.
        </div>
      )}
    </div>
  )
}
