"use client"

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { TOKENS } from "@/lib/wealth-console-tokens"
import type { TrendsReportMonth } from "@/hooks/use-trends-report"
import { monthTotalSpend } from "@/hooks/use-trends-report"
import { TrendsCard, TrendsSectionHeader } from "./trends-shared"

export function TrendsSavingsRateSection({
  months,
  savingsRateSeries,
  loading,
}: {
  months: TrendsReportMonth[]
  savingsRateSeries: Array<number | null>
  loading: boolean
}) {
  const chartData = months.map((m, i) => ({
    label: m.label,
    rate: savingsRateSeries[i],
  }))

  const knownRates = savingsRateSeries.filter((r): r is number => r !== null)
  const avgRate =
    knownRates.length > 0
      ? knownRates.reduce((s, v) => s + v, 0) / knownRates.length
      : null

  return (
    <TrendsCard tone="recessed">
      <TrendsSectionHeader
        title="Savings rate"
        description="Share of income kept after spending each month."
      />
      {loading ? (
        <div className="h-[200px] animate-pulse rounded-xl" style={{ background: TOKENS.surfaceHigh }} />
      ) : (
        <>
          {avgRate !== null ? (
            <p className="mb-3 text-[13px]" style={{ color: TOKENS.onSurfaceMuted }}>
              Period average:{" "}
              <span className="font-semibold tabular-nums" style={{ color: TOKENS.primary }}>
                {avgRate.toFixed(1)}%
              </span>
            </p>
          ) : null}
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={TOKENS.outlineGhost} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: TOKENS.onSurfaceMuted, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `${v}%`}
                tick={{ fill: TOKENS.onSurfaceMuted, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={40}
                domain={[0, 100]}
              />
              {avgRate !== null ? (
                <ReferenceLine
                  y={avgRate}
                  stroke={TOKENS.secondary}
                  strokeDasharray="4 4"
                  strokeOpacity={0.7}
                />
              ) : null}
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const v = payload[0]?.value
                  return (
                    <div
                      className="rounded-xl border px-3 py-2 text-[12px]"
                      style={{
                        background: TOKENS.surfaceContainer,
                        borderColor: TOKENS.outlineGhost,
                        color: TOKENS.onSurface,
                      }}
                    >
                      <p className="font-medium">{label}</p>
                      <p className="tabular-nums">
                        {v === null || v === undefined ? "-" : `${Number(v).toFixed(1)}%`}
                      </p>
                    </div>
                  )
                }}
              />
              <Line
                type="monotone"
                dataKey="rate"
                stroke={TOKENS.primary}
                strokeWidth={2}
                dot={{ r: 3, fill: TOKENS.primary, strokeWidth: 0 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="sr-only">
            Savings rate table:{" "}
            {months
              .map((m, i) => {
                const spend = monthTotalSpend(m)
                const rate = savingsRateSeries[i]
                return `${m.label}: income ${m.totalIncome}, spend ${spend}, rate ${rate ?? "n/a"}%`
              })
              .join("; ")}
          </p>
        </>
      )}
    </TrendsCard>
  )
}
