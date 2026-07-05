"use client"

import { Download } from "lucide-react"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { consoleFocus } from "@/components/wealth-console/console-ui"
import { cn } from "@/lib/utils"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { monthTotalSpend, type TrendsReportMonth } from "@/hooks/use-trends-report"
import { TrendsCard, TrendsSectionHeader } from "./trends-shared"

/** Month-by-month cash flow report: income, spend, invested, net, rate. */
export function TrendsCashFlowTable({
  months,
  savingsRateSeries,
  loading,
  onMonthClick,
}: {
  months: TrendsReportMonth[]
  savingsRateSeries: Array<number | null>
  loading: boolean
  onMonthClick?: (month: number, year: number) => void
}) {
  const { formatCurrency } = useFormatCurrency()

  const rows = months.map((m, i) => {
    const spend = monthTotalSpend(m)
    return {
      month: m.month,
      year: m.year,
      label: m.label,
      income: m.totalIncome,
      spend,
      invested: m.spend.investment,
      net: m.totalIncome - spend,
      rate: savingsRateSeries[i],
      isCurrent: i === months.length - 1,
    }
  })

  const totals = rows.reduce(
    (acc, r) => ({
      income: acc.income + r.income,
      spend: acc.spend + r.spend,
      invested: acc.invested + r.invested,
      net: acc.net + r.net,
    }),
    { income: 0, spend: 0, invested: 0, net: 0 },
  )
  const monthCount = Math.max(rows.length, 1)

  const exportCsv = () => {
    const header = ["Month", "Income", "Spend", "Invested", "Net", "SavingsRatePct"]
    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [
          `${r.year}-${String(r.month).padStart(2, "0")}`,
          r.income.toFixed(2),
          r.spend.toFixed(2),
          r.invested.toFixed(2),
          r.net.toFixed(2),
          r.rate != null ? r.rate.toFixed(1) : "",
        ].join(","),
      ),
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `cash-flow-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const headCell =
    "px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-right"
  const cell = "px-3 py-2.5 text-right tabular-nums"

  return (
    <TrendsCard>
      <TrendsSectionHeader
        title="Monthly cash flow"
        description="Exact figures behind the charts. Click a month to open its expenses."
        action={
          !loading && rows.length > 0 ? (
            <button
              type="button"
              onClick={exportCsv}
              className={cn(
                consoleFocus,
                "inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors hover:bg-white/5",
              )}
              style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurfaceMuted }}
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              CSV
            </button>
          ) : null
        }
      />
      {loading ? (
        <div className="space-y-2" aria-hidden>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-9 animate-pulse rounded-lg"
              style={{ background: TOKENS.surfaceLow }}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[13px]">
            <thead>
              <tr style={{ color: TOKENS.onSurfaceMutedElevated }}>
                <th className={cn(headCell, "text-left")}>Month</th>
                <th className={headCell}>Income</th>
                <th className={headCell}>Spend</th>
                <th className={headCell}>Invested</th>
                <th className={headCell}>Net</th>
                <th className={headCell}>Rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={`${r.year}-${r.month}`}
                  className={cn(
                    "border-t transition-colors",
                    onMonthClick && "cursor-pointer hover:bg-white/[0.03]",
                  )}
                  style={{ borderColor: TOKENS.outlineGhost }}
                  onClick={onMonthClick ? () => onMonthClick(r.month, r.year) : undefined}
                >
                  <td className="px-3 py-2.5 text-left font-medium" style={{ color: TOKENS.onSurface }}>
                    {r.label}
                    {r.isCurrent ? (
                      <span className="ml-1.5 text-[10px]" style={{ color: TOKENS.onSurfaceMuted }}>
                        · so far
                      </span>
                    ) : null}
                  </td>
                  <td className={cell} style={{ color: TOKENS.onSurface }}>
                    {formatCurrency(r.income)}
                  </td>
                  <td className={cell} style={{ color: TOKENS.onSurfaceMuted }}>
                    {formatCurrency(r.spend)}
                  </td>
                  <td className={cell} style={{ color: TOKENS.onSurfaceMuted }}>
                    {formatCurrency(r.invested)}
                  </td>
                  <td
                    className={cn(cell, "font-semibold")}
                    style={{ color: r.net >= 0 ? TOKENS.primary : TOKENS.loss }}
                  >
                    {r.net >= 0 ? "+" : "−"}
                    {formatCurrency(Math.abs(r.net))}
                  </td>
                  <td className={cell} style={{ color: TOKENS.onSurfaceMuted }}>
                    {r.rate != null ? `${r.rate.toFixed(0)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr
                className="border-t"
                style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurface }}
              >
                <td className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider">
                  Total · avg/mo
                </td>
                <td className={cn(cell, "font-semibold")}>
                  {formatCurrency(totals.income)}
                  <span className="block text-[10px] font-normal" style={{ color: TOKENS.onSurfaceMuted }}>
                    {formatCurrency(totals.income / monthCount)}
                  </span>
                </td>
                <td className={cn(cell, "font-semibold")}>
                  {formatCurrency(totals.spend)}
                  <span className="block text-[10px] font-normal" style={{ color: TOKENS.onSurfaceMuted }}>
                    {formatCurrency(totals.spend / monthCount)}
                  </span>
                </td>
                <td className={cn(cell, "font-semibold")}>
                  {formatCurrency(totals.invested)}
                  <span className="block text-[10px] font-normal" style={{ color: TOKENS.onSurfaceMuted }}>
                    {formatCurrency(totals.invested / monthCount)}
                  </span>
                </td>
                <td
                  className={cn(cell, "font-semibold")}
                  style={{ color: totals.net >= 0 ? TOKENS.primary : TOKENS.loss }}
                >
                  {totals.net >= 0 ? "+" : "−"}
                  {formatCurrency(Math.abs(totals.net))}
                </td>
                <td className={cell}>
                  {totals.income > 0
                    ? `${((totals.net / totals.income) * 100).toFixed(0)}%`
                    : "—"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </TrendsCard>
  )
}
