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

export type NetWorthSnapshot = {
  month: number
  year: number
  label: string
  cashValue: number
  investmentValue: number
  loanValue: number
  superValue?: number
  netWorth: number
}

type Props = {
  data: NetWorthSnapshot[]
  formatCurrency: (n: number) => string
}

const BREAKDOWN_COLORS = {
  cash: TOKENS.secondary,
  invested: "#a78bfa",
  super: "#fb923c",
  loans: TOKENS.loss,
}

function TooltipRow({
  label,
  value,
  color,
  formatCurrency,
}: {
  label: string
  value: number
  color: string
  formatCurrency: (n: number) => string
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-[12px]">
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: color }}
        />
        <span style={{ color: TOKENS.onSurfaceMuted }}>{label}</span>
      </span>
      <span className="tabular-nums">{formatCurrency(value)}</span>
    </div>
  )
}

function CustomTooltip({
  active,
  payload,
  label,
  formatCurrency,
}: {
  active?: boolean
  payload?: { value: number; dataKey: string }[]
  label?: string
  formatCurrency: (n: number) => string
}) {
  if (!active || !payload?.length) return null
  const nw = payload.find((p) => p.dataKey === "netWorth")
  const cash = payload.find((p) => p.dataKey === "cashValue")
  const inv = payload.find((p) => p.dataKey === "investmentValue")
  const loan = payload.find((p) => p.dataKey === "loanValue")
  const superVal = payload.find((p) => p.dataKey === "superValue")

  return (
    <div
      className="min-w-[190px] rounded-2xl border p-3 text-[13px] shadow-xl"
      style={{
        background: TOKENS.surfaceContainer,
        borderColor: TOKENS.outlineGhost,
        color: TOKENS.onSurface,
      }}
    >
      <p className="mb-2 font-semibold">{label}</p>
      {nw && (
        <div className="flex justify-between gap-4 py-0.5">
          <span style={{ color: TOKENS.primary }}>Net worth</span>
          <span className="tabular-nums font-semibold">{formatCurrency(nw.value)}</span>
        </div>
      )}
      <div className="mt-1.5 space-y-1 border-t pt-1.5" style={{ borderColor: TOKENS.outlineGhost }}>
        {cash && (
          <TooltipRow label="Cash" value={cash.value} color={BREAKDOWN_COLORS.cash} formatCurrency={formatCurrency} />
        )}
        {inv && (
          <TooltipRow label="Invested" value={inv.value} color={BREAKDOWN_COLORS.invested} formatCurrency={formatCurrency} />
        )}
        {superVal && superVal.value > 0 && (
          <TooltipRow label="Super" value={superVal.value} color={BREAKDOWN_COLORS.super} formatCurrency={formatCurrency} />
        )}
        {loan && loan.value > 0 && (
          <TooltipRow label="Loans out" value={loan.value} color={BREAKDOWN_COLORS.loans} formatCurrency={formatCurrency} />
        )}
      </div>
    </div>
  )
}

export function NetWorthChart({ data, formatCurrency }: Props) {
  const allValues = data.map((d) => d.netWorth)
  const minVal = Math.min(...allValues, 0)
  const maxVal = Math.max(...allValues, 0)
  const padding = Math.max((maxVal - minVal) * 0.15, 1000)

  const fmtAxis = (v: number) => {
    const abs = Math.abs(v)
    const sign = v < 0 ? "-" : ""
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
    if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}k`
    return formatCurrency(v)
  }

  return (
    <>
      <p className="sr-only" id="net-worth-chart-hint">
        Net worth over time chart. Values are point-in-time snapshots recorded each month.
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={TOKENS.primary} stopOpacity={0.18} />
              <stop offset="95%" stopColor={TOKENS.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={TOKENS.outlineGhost} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: TOKENS.onSurfaceMuted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={fmtAxis}
            tick={{ fill: TOKENS.onSurfaceMuted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={60}
            domain={[Math.floor(minVal - padding), Math.ceil(maxVal + padding)]}
          />
          <Tooltip
            content={(props) => (
              <CustomTooltip {...props} formatCurrency={formatCurrency} />
            )}
          />
          {/* Hidden series — exist only to populate tooltip payload */}
          <Area dataKey="cashValue" stroke="none" fill="none" legendType="none" />
          <Area dataKey="investmentValue" stroke="none" fill="none" legendType="none" />
          <Area dataKey="loanValue" stroke="none" fill="none" legendType="none" />
          <Area dataKey="superValue" stroke="none" fill="none" legendType="none" />
          {/* Main net worth line */}
          <Area
            type="monotone"
            dataKey="netWorth"
            stroke={TOKENS.primary}
            strokeWidth={2.5}
            fill="url(#nwGrad)"
            dot={false}
            activeDot={{ r: 5, fill: TOKENS.primary, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Screen-reader table */}
      <table className="sr-only">
        <caption>Net worth by month</caption>
        <thead>
          <tr>
            <th>Month</th>
            <th>Net Worth</th>
            <th>Cash</th>
            <th>Invested</th>
            <th>Super</th>
            <th>Loans</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <td>{d.label}</td>
              <td>{formatCurrency(d.netWorth)}</td>
              <td>{formatCurrency(d.cashValue)}</td>
              <td>{formatCurrency(d.investmentValue)}</td>
              <td>{formatCurrency(d.superValue ?? 0)}</td>
              <td>{formatCurrency(d.loanValue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
