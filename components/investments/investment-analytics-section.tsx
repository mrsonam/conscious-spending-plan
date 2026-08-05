"use client"

import { INVESTMENTS_PANEL_TABS_ID } from "@/components/investments/investment-console-ui"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"

type AllocationRow = {
  symbol: string
  amount: number
  dividends: number
}

type InvestmentAnalyticsSectionProps = {
  rows: AllocationRow[]
  total: number
  formatCurrency: (amount: number) => string
}

export function InvestmentAnalyticsSection({
  rows,
  total,
  formatCurrency,
}: InvestmentAnalyticsSectionProps) {
  return (
    <section
      id="investments-panel-analytics"
      role="tabpanel"
      aria-labelledby={`${INVESTMENTS_PANEL_TABS_ID}-analytics`}
      className="rounded-xl border p-5 sm:p-6"
      style={{
        background: TOKENS.surfaceContainer,
        borderColor: TOKENS.outlineGhost,
        boxShadow: CARD_INSET,
      }}
    >
      <p className="text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
        Portfolio composition
      </p>
      <p className="mt-1 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
        Top holdings by invested amount
      </p>
      <div className="mt-4 space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
            No holdings yet.
          </p>
        ) : (
          rows.map((row) => {
            const pct = total > 0 ? (row.amount / total) * 100 : 0
            return (
              <div key={row.symbol}>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span style={{ color: TOKENS.onSurface }}>{row.symbol}</span>
                  <span className="tabular-nums font-semibold" style={{ color: TOKENS.onSurface }}>
                    {formatCurrency(row.amount)}{" "}
                    <span style={{ color: TOKENS.onSurfaceMuted }}>({pct.toFixed(0)}%)</span>
                  </span>
                </div>
                {row.dividends > 0 ? (
                  <p className="mt-0.5 text-[10px] tabular-nums" style={{ color: TOKENS.primary }}>
                    Dividends received {formatCurrency(row.dividends)}
                  </p>
                ) : null}
                <div
                  role="progressbar"
                  aria-valuenow={Math.round(pct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${row.symbol} ${pct.toFixed(0)} percent of portfolio`}
                  className="mt-1.5 h-2 w-full overflow-hidden rounded-full"
                  style={{ background: TOKENS.surfaceHigh }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: TOKENS.secondary, boxShadow: CARD_INSET }}
                  />
                </div>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
