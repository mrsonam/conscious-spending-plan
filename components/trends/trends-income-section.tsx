"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import type { TrendsReportMonth } from "@/hooks/use-trends-report"
import { TrendsCard, TrendsSectionHeader } from "./trends-shared"

export function TrendsIncomeSection({
  months,
  incomeSources,
  avgMonthlyIncome,
  loading,
}: {
  months: TrendsReportMonth[]
  incomeSources: Array<{ label: string; total: number }>
  avgMonthlyIncome: number
  loading: boolean
}) {
  const { formatCurrency } = useFormatCurrency()
  const chartData = months.map((m) => ({
    label: m.label,
    income: m.totalIncome,
  }))
  const maxIncome = Math.max(...months.map((m) => m.totalIncome), 0)
  const best = months.reduce(
    (best, m) => (m.totalIncome > best.totalIncome ? m : best),
    months[0] ?? { label: "-", totalIncome: 0 },
  )

  return (
    <TrendsCard>
      <TrendsSectionHeader
        title="Income trend"
        description="Monthly inflows and where they come from."
      />
      {loading ? (
        <div className="h-[220px] animate-pulse rounded-xl" style={{ background: TOKENS.surfaceHigh }} />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl px-3 py-2.5" style={{ background: TOKENS.surfaceLow }}>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                Avg / month
              </p>
              <p className="mt-0.5 text-[16px] font-semibold tabular-nums" style={{ color: TOKENS.primary }}>
                {formatCurrency(avgMonthlyIncome)}
              </p>
            </div>
            <div className="rounded-xl px-3 py-2.5" style={{ background: TOKENS.surfaceLow }}>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                Best month
              </p>
              <p className="mt-0.5 text-[16px] font-semibold tabular-nums" style={{ color: TOKENS.onSurface }}>
                {formatCurrency(best.totalIncome)}
              </p>
              <p className="text-[10px]" style={{ color: TOKENS.onSurfaceMuted }}>
                {best.label}
              </p>
            </div>
            <div className="col-span-2 rounded-xl px-3 py-2.5 sm:col-span-1" style={{ background: TOKENS.surfaceLow }}>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                Sources
              </p>
              <ul className="mt-1 space-y-0.5">
                {incomeSources.slice(0, 3).map((s) => (
                  <li
                    key={s.label}
                    className="flex justify-between gap-2 text-[11px]"
                    style={{ color: TOKENS.onSurface }}
                  >
                    <span className="truncate">{s.label}</span>
                    <span className="shrink-0 tabular-nums">{formatCurrency(s.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={TOKENS.outlineGhost} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: TOKENS.onSurfaceMuted, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => formatCurrency(v)}
                tick={{ fill: TOKENS.onSurfaceMuted, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={64}
                domain={[0, Math.ceil(maxIncome * 1.1)]}
              />
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
                      <p className="tabular-nums">{formatCurrency(Number(v ?? 0))}</p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="income" fill={TOKENS.primary} radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </TrendsCard>
  )
}
