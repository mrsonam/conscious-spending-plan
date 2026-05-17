"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { TOKENS } from "@/lib/wealth-console-tokens"
import type { PortfolioChartPoint } from "@/components/investments/investment-shared"

type InvestmentPortfolioChartProps = {
  data: PortfolioChartPoint[]
  formatCurrency: (amount: number) => string
}

export function InvestmentPortfolioChart({
  data,
  formatCurrency,
}: InvestmentPortfolioChartProps) {
  const hintId = "investment-chart-keyboard-hint"

  return (
    <>
      <p id={hintId} className="sr-only">
        Portfolio value chart is visual only. A data table with the same points
        follows for screen readers.
      </p>
      <ChartBody data={data} formatCurrency={formatCurrency} describedBy={hintId} />
      <table className="sr-only">
        <caption>Portfolio value over time</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.t}>
              <td>
                {new Date(row.t).toLocaleDateString("en-US", {
                  dateStyle: "medium",
                })}
              </td>
              <td>{formatCurrency(row.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

function ChartBody({
  data,
  formatCurrency,
  describedBy,
}: InvestmentPortfolioChartProps & { describedBy: string }) {
  return (
    <div
      className="h-[240px] w-full min-h-[220px] sm:h-[280px]"
      role="img"
      aria-label="Portfolio value over time"
      aria-describedby={describedBy}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data.map((d, i) => ({ ...d, i }))}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="portfolioValueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={TOKENS.primary} stopOpacity={0.35} />
              <stop offset="100%" stopColor={TOKENS.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke={TOKENS.outlineGhost}
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="t"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v) =>
              new Date(v)
                .toLocaleDateString("en-US", { month: "short", year: "2-digit" })
                .toUpperCase()
            }
            stroke={TOKENS.onSurfaceMuted}
            tick={{ fill: TOKENS.onSurfaceMuted, fontSize: 10 }}
            axisLine={{ stroke: TOKENS.outlineGhost }}
          />
          <YAxis
            tickFormatter={(v) =>
              v >= 1_000_000
                ? `$${(v / 1_000_000).toFixed(1)}M`
                : v >= 1000
                  ? `$${(v / 1000).toFixed(0)}k`
                  : `$${v}`
            }
            stroke={TOKENS.onSurfaceMuted}
            tick={{ fill: TOKENS.onSurfaceMuted, fontSize: 10 }}
            axisLine={{ stroke: TOKENS.outlineGhost }}
            width={52}
          />
          <Tooltip
            contentStyle={{
              background: TOKENS.surfaceHigh,
              border: `1px solid ${TOKENS.outlineGhost}`,
              borderRadius: 12,
              fontSize: 12,
              color: TOKENS.onSurface,
            }}
            labelFormatter={(v) =>
              new Date(v as number).toLocaleDateString("en-US", {
                dateStyle: "medium",
              })
            }
            formatter={(value) => [
              formatCurrency(Number(value ?? 0)),
              "Value",
            ]}
          />
          <Area
            type="monotone"
            dataKey="value"
            baseValue={0}
            stroke={TOKENS.primary}
            strokeWidth={2}
            fill="url(#portfolioValueFill)"
            dot={false}
            activeDot={{ r: 4, fill: TOKENS.primary }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
