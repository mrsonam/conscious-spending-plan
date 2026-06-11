"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts"
import { TOKENS } from "@/lib/wealth-console-tokens"

export type SpendingTrendMonth = {
  month: number
  year: number
  label: string
  spend: {
    fixedCosts: number
    savings: number
    investment: number
    guiltFreeSpending: number
  }
  allocated: {
    fixedCosts: number
    savings: number
    investment: number
    guiltFreeSpending: number
  }
  totalIncome: number
}

const CATEGORY_COLORS = {
  fixedCosts: "#ef4444",
  savings: "#10b981",
  investment: "#3b82f6",
  guiltFreeSpending: "#8b5cf6",
} as const

const CATEGORY_LABELS = {
  fixedCosts: "Fixed Costs",
  savings: "Savings",
  investment: "Investments",
  guiltFreeSpending: "Guilt-Free",
} as const

type Props = {
  data: SpendingTrendMonth[]
  formatCurrency: (n: number) => string
}

function CustomTooltip({ active, payload, label, formatCurrency }: {
  active?: boolean
  payload?: { name: string; value: number; color: string; dataKey: string }[]
  label?: string
  formatCurrency: (n: number) => string
}) {
  if (!active || !payload?.length) return null

  const income = payload.find((p) => p.dataKey === "totalIncome")
  const bars = payload.filter((p) => p.dataKey !== "totalIncome")
  const total = bars.reduce((s, p) => s + (p.value ?? 0), 0)

  return (
    <div
      className="rounded-2xl border p-3 text-[13px] shadow-xl min-w-[180px]"
      style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
    >
      <p className="mb-2 font-semibold">{label}</p>
      {bars.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5" style={{ color: TOKENS.onSurfaceMuted }}>
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
            {CATEGORY_LABELS[p.dataKey.replace("spend.", "") as keyof typeof CATEGORY_LABELS] ?? p.name}
          </span>
          <span className="tabular-nums font-medium" style={{ color: TOKENS.onSurface }}>
            {formatCurrency(p.value)}
          </span>
        </div>
      ))}
      <div className="mt-2 border-t pt-2 flex justify-between" style={{ borderColor: TOKENS.outlineGhost }}>
        <span style={{ color: TOKENS.onSurfaceMuted }}>Total spend</span>
        <span className="tabular-nums font-semibold">{formatCurrency(total)}</span>
      </div>
      {income && (
        <div className="flex justify-between pt-1">
          <span style={{ color: TOKENS.onSurfaceMuted }}>Income</span>
          <span className="tabular-nums font-medium" style={{ color: TOKENS.primary }}>
            {formatCurrency(income.value)}
          </span>
        </div>
      )}
    </div>
  )
}

export function SpendingTrendsChart({ data, formatCurrency }: Props) {
  const chartData = data.map((d) => ({
    label: d.label,
    "spend.fixedCosts": d.spend.fixedCosts,
    "spend.savings": d.spend.savings,
    "spend.investment": d.spend.investment,
    "spend.guiltFreeSpending": d.spend.guiltFreeSpending,
    totalIncome: d.totalIncome,
  }))

  const allAmounts = data.flatMap((d) => [
    d.spend.fixedCosts + d.spend.savings + d.spend.investment + d.spend.guiltFreeSpending,
    d.totalIncome,
  ])
  const maxVal = Math.max(...allAmounts, 0)

  return (
    <>
      <p className="sr-only" id="trends-chart-hint">
        Spending trends chart. A data table with the same values follows for screen readers.
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={TOKENS.outlineGhost}
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: TOKENS.onSurfaceMuted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => formatCurrency(v)}
            tick={{ fill: TOKENS.onSurfaceMuted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={72}
            domain={[0, Math.ceil(maxVal * 1.1)]}
          />
          <Tooltip
            content={(props) => (
              <CustomTooltip
                {...props}
                formatCurrency={formatCurrency}
              />
            )}
          />
          <Bar dataKey="spend.fixedCosts" stackId="spend" fill={CATEGORY_COLORS.fixedCosts} radius={[0, 0, 0, 0]} maxBarSize={40} />
          <Bar dataKey="spend.savings" stackId="spend" fill={CATEGORY_COLORS.savings} maxBarSize={40} />
          <Bar dataKey="spend.investment" stackId="spend" fill={CATEGORY_COLORS.investment} maxBarSize={40} />
          <Bar dataKey="spend.guiltFreeSpending" stackId="spend" fill={CATEGORY_COLORS.guiltFreeSpending} radius={[4, 4, 0, 0]} maxBarSize={40} />
          <Line
            type="monotone"
            dataKey="totalIncome"
            stroke={TOKENS.primary}
            strokeWidth={2}
            dot={{ fill: TOKENS.primary, r: 3, strokeWidth: 0 }}
            strokeDasharray="5 3"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {(Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]).map((cat) => (
          <span key={cat} className="flex items-center gap-1.5 text-[12px]" style={{ color: TOKENS.onSurfaceMuted }}>
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: CATEGORY_COLORS[cat] }} />
            {CATEGORY_LABELS[cat]}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-[12px]" style={{ color: TOKENS.onSurfaceMuted }}>
          <span className="inline-block h-[2px] w-5 rounded-full" style={{ background: TOKENS.primary }} />
          Income
        </span>
      </div>

      {/* Screen-reader table */}
      <table className="sr-only">
        <caption>Monthly spending by category</caption>
        <thead>
          <tr>
            <th>Month</th>
            <th>Fixed Costs</th>
            <th>Savings</th>
            <th>Investments</th>
            <th>Guilt-Free</th>
            <th>Income</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <td>{d.label}</td>
              <td>{formatCurrency(d.spend.fixedCosts)}</td>
              <td>{formatCurrency(d.spend.savings)}</td>
              <td>{formatCurrency(d.spend.investment)}</td>
              <td>{formatCurrency(d.spend.guiltFreeSpending)}</td>
              <td>{formatCurrency(d.totalIncome)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
