"use client"

import { Briefcase } from "lucide-react"
import {
  formatInvestmentDateShort,
  type InvestmentAccountSummary,
} from "@/components/investments/investment-shared"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "@/lib/income-page-types"

type InvestmentHoldingsSectionProps = {
  accounts: InvestmentAccountSummary[]
  searchQuery: string
  marketPrices: Record<string, number>
  formatCurrency: (amount: number) => string
}

function matchesSearch(
  query: string,
  holdingName: string,
  accountName: string,
  bankName: string,
) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    holdingName.toLowerCase().includes(q) ||
    accountName.toLowerCase().includes(q) ||
    bankName.toLowerCase().includes(q)
  )
}

export function InvestmentHoldingsSection({
  accounts,
  searchQuery,
  marketPrices,
  formatCurrency,
}: InvestmentHoldingsSectionProps) {
  return (
    <section
      className="rounded-xl border p-5 sm:p-6"
      style={{
        background: TOKENS.surfaceContainer,
        borderColor: TOKENS.outlineGhost,
        boxShadow: CARD_INSET,
      }}
      aria-labelledby="investment-holdings-heading"
    >
      <h2
        id="investment-holdings-heading"
        className="flex items-center gap-2 text-sm font-semibold"
        style={{ color: TOKENS.onSurface }}
      >
        <Briefcase className="h-4 w-4" style={{ color: TOKENS.secondary }} aria-hidden />
        Holdings by account
      </h2>
      <p className="mt-1 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
        Merged positions with latest purchase activity.
      </p>

      <div className="mt-4 space-y-4">
        {accounts.map((acc) => {
          const filtered = acc.holdings.filter((h) =>
            matchesSearch(searchQuery, h.name, acc.name, acc.bankName),
          )

          return (
            <article
              key={acc.id}
              className="rounded-xl border p-4"
              style={{
                borderColor: TOKENS.outlineGhost,
                background: TOKENS.surfaceLow,
                boxShadow: CARD_INSET,
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
                    {acc.name}
                  </p>
                  <p className="text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>
                    {acc.bankName}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    Cash
                  </p>
                  <p className="text-sm font-bold tabular-nums" style={{ color: TOKENS.onSurface }}>
                    {formatCurrency(acc.balance)}
                  </p>
                  {(acc.dividendIncomeTotal ?? 0) > 0 ? (
                    <p className="mt-1 text-[10px] tabular-nums" style={{ color: TOKENS.primary }}>
                      Dividends (all-time) {formatCurrency(acc.dividendIncomeTotal ?? 0)}
                    </p>
                  ) : null}
                </div>
              </div>

              {filtered.length === 0 ? (
                <p className="mt-3 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
                  No holdings yet.
                </p>
              ) : (
                <ul
                  className="mt-3 divide-y"
                  style={{
                    borderColor: `color-mix(in srgb, ${TOKENS.outlineGhost} 70%, transparent)`,
                  }}
                >
                  {filtered.slice(0, 6).map((h) => {
                    const symbol = h.name.trim().toUpperCase()
                    const currentPrice = marketPrices[symbol]
                    const hasMarket =
                      !!currentPrice && currentPrice > 0 && h.totalShares > 0
                    const currentValue = hasMarket ? currentPrice * h.totalShares : 0
                    const gainLoss = hasMarket ? currentValue - h.totalAmount : 0
                    const gainLossPct =
                      hasMarket && h.totalAmount > 0
                        ? (gainLoss / h.totalAmount) * 100
                        : 0

                    return (
                      <li
                        key={`${acc.id}-${h.name}`}
                        className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"
                      >
                        <div className="min-w-0">
                          <p
                            className="truncate text-sm font-semibold"
                            style={{ color: TOKENS.onSurface }}
                          >
                            {h.name}
                          </p>
                          <p className="text-[10px]" style={{ color: TOKENS.onSurfaceMuted }}>
                            {h.totalShares > 0
                              ? `${h.totalShares.toFixed(2)} shares · avg ${formatCurrency(h.averagePrice)}`
                              : "Amount-only holding"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className="text-sm font-bold tabular-nums"
                            style={{ color: TOKENS.secondary }}
                          >
                            {formatCurrency(h.totalAmount)}
                          </p>
                          {hasMarket ? (
                            <p
                              className="text-[10px] tabular-nums"
                              style={{ color: gainLoss >= 0 ? TOKENS.primary : ERROR_SOFT }}
                            >
                              {gainLoss >= 0 ? "+" : ""}
                              {formatCurrency(gainLoss)} ({gainLossPct >= 0 ? "+" : ""}
                              {gainLossPct.toFixed(2)}%)
                            </p>
                          ) : null}
                          <p className="text-[10px]" style={{ color: TOKENS.onSurfaceMuted }}>
                            Last {formatInvestmentDateShort(h.lastPurchaseDate)}
                          </p>
                          {(h.dividendIncome ?? 0) > 0 ? (
                            <p
                              className="text-[10px] tabular-nums"
                              style={{ color: TOKENS.primary }}
                            >
                              Dividends received {formatCurrency(h.dividendIncome ?? 0)}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
