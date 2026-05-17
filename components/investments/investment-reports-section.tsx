"use client"

import { INVESTMENTS_PANEL_TABS_ID } from "@/components/investments/investment-console-ui"
import { formatInvestmentDateShort } from "@/components/investments/investment-shared"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"

type ActivityRow = {
  id: string
  date: string
  symbol: string
  account: string
  amount: number
  kind: "buy" | "dividend"
}

type InvestmentReportsSectionProps = {
  rows: ActivityRow[]
  formatCurrency: (amount: number) => string
}

export function InvestmentReportsSection({
  rows,
  formatCurrency,
}: InvestmentReportsSectionProps) {
  return (
    <section
      id="investments-panel-reports"
      role="tabpanel"
      aria-labelledby={`${INVESTMENTS_PANEL_TABS_ID}-reports`}
      className="rounded-xl border p-5 sm:p-6"
      style={{
        background: TOKENS.surfaceContainer,
        borderColor: TOKENS.outlineGhost,
        boxShadow: CARD_INSET,
      }}
    >
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.22em]"
        style={{ color: TOKENS.onSurfaceMuted }}
      >
        Transaction ledger
      </p>
      <p className="mt-1 text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
        Recent activity
      </p>
      <p className="mt-1 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
        Buys and dividend payments across your investment accounts
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-xs">
          <thead>
            <tr style={{ borderBottom: `1px solid ${TOKENS.outlineGhost}` }}>
              <th className="px-2 py-2 font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>Asset</th>
              <th className="px-2 py-2 font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>Action</th>
              <th className="px-2 py-2 font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>Reference</th>
              <th className="px-2 py-2 font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>Account</th>
              <th className="px-2 py-2 text-right font-semibold uppercase tracking-wider" style={{ color: TOKENS.primary }}>Amount</th>
              <th className="px-2 py-2 text-right font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row.kind}-${row.id}`}
                style={{
                  borderBottom: `1px solid color-mix(in srgb, ${TOKENS.outlineGhost} 55%, transparent)`,
                }}
              >
                <td className="px-2 py-2.5">
                  <span className="font-semibold" style={{ color: TOKENS.onSurface }}>
                    {row.symbol}
                  </span>
                  <span className="ml-2 text-[10px]" style={{ color: TOKENS.onSurfaceMuted }}>
                    {formatInvestmentDateShort(row.date)}
                  </span>
                </td>
                <td
                  className="px-2 py-2.5 font-semibold uppercase tracking-wide"
                  style={{ color: row.kind === "dividend" ? TOKENS.primary : TOKENS.secondary }}
                >
                  {row.kind === "dividend" ? "Dividend" : "Buy"}
                </td>
                <td className="px-2 py-2.5 font-mono text-[10px]" style={{ color: TOKENS.onSurfaceMuted }}>
                  {row.id.slice(0, 8)}…
                </td>
                <td className="px-2 py-2.5" style={{ color: TOKENS.onSurface }}>
                  {row.account}
                </td>
                <td
                  className="px-2 py-2.5 text-right font-semibold tabular-nums"
                  style={{ color: row.kind === "dividend" ? TOKENS.primary : TOKENS.onSurface }}
                >
                  {row.kind === "dividend" ? "+" : ""}
                  {formatCurrency(row.amount)}
                </td>
                <td className="px-2 py-2.5 text-right">
                  <span className="inline-flex items-center justify-end gap-1.5">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        background: row.kind === "dividend" ? TOKENS.secondary : TOKENS.primary,
                      }}
                    />
                    <span
                      className="font-semibold uppercase tracking-wide"
                      style={{
                        color: row.kind === "dividend" ? TOKENS.secondary : TOKENS.primary,
                      }}
                    >
                      {row.kind === "dividend" ? "Credited" : "Executed"}
                    </span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-center text-[10px]" style={{ color: TOKENS.onSurfaceMuted }}>
        Showing the 12 most recent buys and dividends. Use search to narrow the list.
      </p>
    </section>
  )
}
