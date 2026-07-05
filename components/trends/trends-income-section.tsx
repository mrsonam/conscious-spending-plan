"use client"

import { TOKENS } from "@/lib/wealth-console-tokens"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import type { TrendsReportMonth } from "@/hooks/use-trends-report"
import {
  TrendsCard,
  TrendsSectionHeader,
  formatBarAmount,
  shortMonthLabel,
} from "./trends-shared"

const BAR_AREA_PX = 140

function IncomeMonthBars({
  months,
  formatCurrency,
}: {
  months: TrendsReportMonth[]
  formatCurrency: (n: number) => string
}) {
  const values = months.map((m) => m.totalIncome)
  const max = Math.max(...values, 1)

  return (
    <>
      <div
        className="overflow-x-auto"
        role="img"
        aria-label="Monthly income bar chart"
      >
        <div
          className="flex min-w-full gap-px sm:gap-0.5"
          style={{ minWidth: `${months.length * 28}px` }}
        >
          {months.map((m, i) => {
            const v = m.totalIncome
            const barPx =
              v === 0 ? 2 : Math.max(2, (v / max) * BAR_AREA_PX)
            const isPartialMonth = i === months.length - 1
            return (
              <div
                key={`${m.year}-${m.month}`}
                className="flex min-w-0 flex-1 flex-col items-center gap-0.5"
              >
                <div
                  className="flex w-full items-end"
                  style={{ height: BAR_AREA_PX }}
                >
                  <div
                    className="w-full rounded-t-sm"
                    style={{
                      height: barPx,
                      background: TOKENS.primary,
                      opacity: isPartialMonth ? 0.45 : 0.9,
                    }}
                    title={`${m.label}: ${formatCurrency(v)}`}
                  />
                </div>
                <span
                  className="max-w-full truncate text-center text-[9px] leading-none tabular-nums"
                  style={{ color: TOKENS.onSurfaceMuted }}
                  title={formatCurrency(v)}
                >
                  {formatBarAmount(v, formatCurrency)}
                </span>
                <span
                  className="max-w-full truncate text-center text-[9px] leading-none"
                  style={{ color: TOKENS.onSurfaceMuted }}
                  title={m.label}
                >
                  {shortMonthLabel(m.label)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <table className="sr-only">
        <caption>Monthly income</caption>
        <thead>
          <tr>
            <th>Month</th>
            <th>Income</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m) => (
            <tr key={`${m.year}-${m.month}`}>
              <td>{m.label}</td>
              <td>{formatCurrency(m.totalIncome)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

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
  // Best month from complete months only — the current partial month would
  // never win fairly and shouldn't skew the stat.
  const completeMonths = months.length > 1 ? months.slice(0, -1) : months
  const best = completeMonths.reduce(
    (best, m) => (m.totalIncome > best.totalIncome ? m : best),
    completeMonths[0] ?? { label: "-", totalIncome: 0 },
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
          <IncomeMonthBars months={months} formatCurrency={formatCurrency} />
        </>
      )}
    </TrendsCard>
  )
}
