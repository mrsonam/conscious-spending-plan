"use client"

import { useMemo } from "react"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import type { TrendsReportMonth } from "@/hooks/use-trends-report"
import {
  TrendsCard,
  TrendsSectionHeader,
  formatCategoryLabel,
} from "./trends-shared"

const MINI_COLORS = [
  TOKENS.secondary,
  "#a78bfa",
  "#fb923c",
  TOKENS.primary,
  "#f472b6",
  "#eab308",
] as const

function CategoryMiniChart({
  label,
  values,
  avg,
  formatCurrency,
  color,
}: {
  label: string
  values: number[]
  avg: number
  formatCurrency: (n: number) => string
  color: string
}) {
  const max = Math.max(...values, avg, 1)
  const last = values.length >= 2 ? values[values.length - 2] : null
  const prev = values.length >= 2 ? values[values.length - 3] : null
  let mom: number | null = null
  if (last !== null && prev !== null && prev > 0) {
    mom = ((last - prev) / prev) * 100
  }

  return (
    <div
      className="rounded-xl p-3"
      style={{ background: TOKENS.surfaceLow }}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p
          className="truncate text-[12px] font-medium"
          style={{ color: TOKENS.onSurface }}
          title={label}
        >
          {label}
        </p>
        {mom !== null && Math.abs(mom) >= 5 ? (
          <span
            className="shrink-0 text-[10px] font-semibold tabular-nums"
            style={{ color: mom > 0 ? TOKENS.warning : TOKENS.primary }}
          >
            {mom > 0 ? "+" : ""}
            {mom.toFixed(0)}%
          </span>
        ) : null}
      </div>
      <div className="flex h-14 items-end gap-0.5">
        {values.map((v, i) => (
          <div
            key={i}
            className="min-w-0 flex-1 rounded-t-sm transition-opacity"
            style={{
              height: `${Math.max(4, (v / max) * 100)}%`,
              background: color,
              opacity: i === values.length - 1 ? 0.45 : 0.85,
            }}
            title={formatCurrency(v)}
          />
        ))}
      </div>
      <p className="mt-2 text-[10px] tabular-nums" style={{ color: TOKENS.onSurfaceMuted }}>
        avg {formatCurrency(avg)}
      </p>
    </div>
  )
}

export function TrendsCategorySection({
  months,
  topCategories,
  loading,
}: {
  months: TrendsReportMonth[]
  topCategories: string[]
  loading: boolean
}) {
  const { formatCurrency } = useFormatCurrency()
  const displayCategories = topCategories.filter((c) => c !== "other").slice(0, 6)

  const series = useMemo(() => {
    return displayCategories.map((cat) => {
      const values = months.map((m) => m.expenseCategories[cat] ?? 0)
      const complete = values.slice(0, -1)
      const avg =
        complete.length > 0
          ? complete.reduce((s, v) => s + v, 0) / complete.length
          : values.reduce((s, v) => s + v, 0) / Math.max(values.length, 1)
      return { cat, values, avg }
    })
  }, [displayCategories, months])

  if (!loading && displayCategories.length === 0) return null

  return (
    <TrendsCard tone="recessed">
      <TrendsSectionHeader
        title="Category trends"
        description="Top expense categories month over month."
      />
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl"
              style={{ background: TOKENS.surfaceHigh }}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {series.map(({ cat, values, avg }, i) => (
            <CategoryMiniChart
              key={cat}
              label={formatCategoryLabel(cat)}
              values={values}
              avg={avg}
              formatCurrency={formatCurrency}
              color={MINI_COLORS[i % MINI_COLORS.length]}
            />
          ))}
        </div>
      )}
    </TrendsCard>
  )
}
