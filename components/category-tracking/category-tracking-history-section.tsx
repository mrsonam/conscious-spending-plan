"use client"

import { History } from "lucide-react"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"

type RecentMonthRow = {
  month: string
  fixed: number
  investment: number
  savings: number
  guilt: number
  total: number
}

type CategoryTrackingHistorySectionProps = {
  recentMonthRows: RecentMonthRow[]
  formatCurrency: (amount: number) => string
}

export function CategoryTrackingHistorySection({
  recentMonthRows,
  formatCurrency,
}: CategoryTrackingHistorySectionProps) {
  if (recentMonthRows.length === 0) return null

  return (
    <section className="w-full min-w-0">
      <p
        className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em]"
        style={{ color: TOKENS.onSurfaceMuted }}
      >
        <History className="h-3.5 w-3.5" strokeWidth={2} />
        Recent months
      </p>
      <p className="mb-3 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
        Actual spend by fund for the last {recentMonthRows.length} month
        {recentMonthRows.length === 1 ? "" : "s"} on file
      </p>
      <div
        className="overflow-x-auto rounded-xl border"
        style={{
          background: TOKENS.surfaceContainer,
          borderColor: TOKENS.outlineGhost,
          boxShadow: CARD_INSET,
        }}
      >
        <table className="w-full min-w-[520px] border-collapse text-left text-xs">
          <thead>
            <tr style={{ borderBottom: `1px solid ${TOKENS.outlineGhost}` }}>
              <th
                scope="col"
                className="px-3 py-2.5 font-semibold uppercase tracking-wider"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Month
              </th>
              <th
                scope="col"
                className="px-2 py-2.5 text-right font-semibold uppercase tracking-wider"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Fixed
              </th>
              <th
                scope="col"
                className="px-2 py-2.5 text-right font-semibold uppercase tracking-wider"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Inv.
              </th>
              <th
                scope="col"
                className="px-2 py-2.5 text-right font-semibold uppercase tracking-wider"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Save
              </th>
              <th
                scope="col"
                className="px-2 py-2.5 text-right font-semibold uppercase tracking-wider"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Guilt
              </th>
              <th
                scope="col"
                className="px-3 py-2.5 text-right font-semibold uppercase tracking-wider"
                style={{ color: TOKENS.primary }}
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {recentMonthRows.map((row) => (
              <tr
                key={row.month}
                style={{
                  borderBottom: `1px solid color-mix(in srgb, ${TOKENS.outlineGhost} 55%, transparent)`,
                }}
              >
                <td className="px-3 py-2 font-medium tabular-nums" style={{ color: TOKENS.onSurface }}>
                  {row.month}
                </td>
                <td className="px-2 py-2 text-right tabular-nums" style={{ color: TOKENS.onSurface }}>
                  {formatCurrency(row.fixed)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums" style={{ color: TOKENS.onSurface }}>
                  {formatCurrency(row.investment)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums" style={{ color: TOKENS.onSurface }}>
                  {formatCurrency(row.savings)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums" style={{ color: TOKENS.onSurface }}>
                  {formatCurrency(row.guilt)}
                </td>
                <td
                  className="px-3 py-2 text-right font-semibold tabular-nums"
                  style={{ color: TOKENS.onSurface }}
                >
                  {formatCurrency(row.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
