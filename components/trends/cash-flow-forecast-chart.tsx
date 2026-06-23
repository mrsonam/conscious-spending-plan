"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { TOKENS } from "@/lib/wealth-console-tokens"

export type TimelinePoint = {
  date: string
  actualBalance: number | null
  forecastBalance: number
  events: { type: string; label: string; amount: number }[]
}

type Props = {
  data: TimelinePoint[]
  todayIndex: number
  formatCurrency: (n: number) => string
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

const ACTUAL_COLOR = "#60a5fa"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip(props: any) {
  const { active, payload, label, formatCurrency } = props as {
    active?: boolean
    payload?: { dataKey: string; value: number | null; payload: TimelinePoint }[]
    label?: string
    formatCurrency: (n: number) => string
  }
  if (!active || !payload?.length) return null

  const point = payload[0]!.payload
  const actual = point.actualBalance
  const forecast = point.forecastBalance
  const hasActual = actual !== null

  return (
    <div
      className="rounded-2xl border p-3 text-[13px] shadow-xl min-w-[180px] max-w-[280px]"
      style={{
        background: TOKENS.surfaceContainer,
        borderColor: TOKENS.outlineGhost,
        color: TOKENS.onSurface,
      }}
    >
      <p className="mb-1.5 font-semibold">{formatDateLabel(label ?? "")}</p>

      {hasActual && (
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5" style={{ color: TOKENS.onSurfaceMuted }}>
            <span
              className="inline-block h-2 w-2 rounded-sm flex-shrink-0"
              style={{ background: ACTUAL_COLOR }}
            />
            Actual
          </span>
          <span
            className="tabular-nums font-semibold"
            style={{ color: actual >= 0 ? ACTUAL_COLOR : TOKENS.loss }}
          >
            {formatCurrency(actual)}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5" style={{ color: TOKENS.onSurfaceMuted }}>
          <span
            className="inline-block h-2 w-2 rounded-sm flex-shrink-0"
            style={{ background: TOKENS.primary }}
          />
          Forecast
        </span>
        <span
          className="tabular-nums font-semibold"
          style={{ color: forecast >= 0 ? TOKENS.primary : TOKENS.loss }}
        >
          {formatCurrency(forecast)}
        </span>
      </div>

      {hasActual && (
        <div
          className="mt-1.5 flex items-center justify-between gap-4 border-t pt-1.5"
          style={{ borderColor: TOKENS.outlineGhost }}
        >
          <span style={{ color: TOKENS.onSurfaceMuted }}>Difference</span>
          <span
            className="tabular-nums font-medium text-[12px]"
            style={{
              color: actual - forecast >= 0 ? TOKENS.primary : TOKENS.loss,
            }}
          >
            {actual - forecast >= 0 ? "+" : ""}
            {formatCurrency(actual - forecast)}
          </span>
        </div>
      )}

      {point.events.length > 0 && (() => {
        const recurring = point.events.filter((e) => e.type === "recurring")
        const income = point.events.filter((e) => e.type === "income")
        const sections = [
          ...income.map((e) => ({ ...e, isExpense: false })),
          ...recurring.map((e) => ({ ...e, isExpense: true })),
        ]
        if (sections.length === 0) return null
        return (
          <div
            className="mt-1.5 space-y-1 border-t pt-1.5"
            style={{ borderColor: TOKENS.outlineGhost }}
          >
            {sections.map((e, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 truncate" style={{ color: TOKENS.onSurfaceMuted }}>
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full flex-shrink-0"
                    style={{
                      background: e.isExpense ? TOKENS.loss : TOKENS.primary,
                    }}
                  />
                  <span className="truncate">{e.label}</span>
                </span>
                <span
                  className="tabular-nums text-[12px] flex-shrink-0"
                  style={{ color: e.isExpense ? TOKENS.loss : TOKENS.primary }}
                >
                  {e.isExpense ? "-" : "+"}
                  {formatCurrency(e.amount)}
                </span>
              </div>
            ))}
          </div>
        )
      })()}
    </div>
  )
}

export function CashFlowForecastChart({
  data,
  todayIndex,
  formatCurrency,
}: Props) {
  const allValues = data.flatMap((d) =>
    [d.forecastBalance, d.actualBalance].filter(
      (v): v is number => v !== null,
    ),
  )
  const minBal = Math.min(...allValues)
  const maxBal = Math.max(...allValues)
  const padding = (maxBal - minBal) * 0.1 || 500
  const yMin = Math.floor(minBal - padding)
  const yMax = Math.ceil(maxBal + padding)

  const tickInterval = Math.max(1, Math.floor(data.length / 8))

  const todayDate = data[todayIndex]?.date

  return (
    <>
      <ResponsiveContainer width="100%" height={340}>
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="forecast-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={TOKENS.primary} stopOpacity={0.15} />
              <stop offset="100%" stopColor={TOKENS.primary} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="actual-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACTUAL_COLOR} stopOpacity={0.2} />
              <stop offset="100%" stopColor={ACTUAL_COLOR} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={TOKENS.outlineGhost}
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateLabel}
            tick={{ fill: TOKENS.onSurfaceMuted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval={tickInterval}
          />
          <YAxis
            tickFormatter={(v) => formatCurrency(v)}
            tick={{ fill: TOKENS.onSurfaceMuted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={80}
            domain={[yMin, yMax]}
          />
          <Tooltip
            content={(props) => (
              <CustomTooltip {...props} formatCurrency={formatCurrency} />
            )}
          />
          {minBal < 0 && (
            <ReferenceLine
              y={0}
              stroke={TOKENS.loss}
              strokeDasharray="4 3"
              strokeOpacity={0.5}
            />
          )}
          {todayDate && (
            <ReferenceLine
              x={todayDate}
              stroke={TOKENS.onSurfaceMuted}
              strokeDasharray="3 3"
              strokeOpacity={0.4}
              label={{
                value: "Today",
                position: "insideTopRight",
                fill: TOKENS.onSurfaceMuted,
                fontSize: 10,
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="forecastBalance"
            stroke={TOKENS.primary}
            strokeWidth={2}
            strokeDasharray="6 3"
            fill="url(#forecast-grad)"
            dot={false}
            activeDot={{
              r: 4,
              fill: TOKENS.primary,
              stroke: TOKENS.surfaceContainer,
              strokeWidth: 2,
            }}
            connectNulls
          />
          <Area
            type="monotone"
            dataKey="actualBalance"
            stroke={ACTUAL_COLOR}
            strokeWidth={2}
            fill="url(#actual-grad)"
            dot={false}
            activeDot={{
              r: 4,
              fill: ACTUAL_COLOR,
              stroke: TOKENS.surfaceContainer,
              strokeWidth: 2,
            }}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        <span
          className="flex items-center gap-1.5 text-[12px]"
          style={{ color: TOKENS.onSurfaceMuted }}
        >
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: ACTUAL_COLOR }}
          />
          Actual balance
        </span>
        <span
          className="flex items-center gap-1.5 text-[12px]"
          style={{ color: TOKENS.onSurfaceMuted }}
        >
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: TOKENS.primary }}
          />
          Forecast
        </span>
      </div>
    </>
  )
}
