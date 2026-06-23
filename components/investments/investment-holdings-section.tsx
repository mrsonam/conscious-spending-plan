"use client"

import { useState } from "react"
import { Briefcase, ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react"
import {
  formatInvestmentDateShort,
  type InvestmentAccountSummary,
  type InvestmentPurchase,
} from "@/components/investments/investment-shared"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "@/lib/income-page-types"
import { cn } from "@/lib/utils"
import { consoleFocus } from "@/components/wealth-console/console-ui"

type InvestmentHoldingsSectionProps = {
  accounts: InvestmentAccountSummary[]
  searchQuery: string
  marketPrices: Record<string, number>
  formatCurrency: (amount: number) => string
  onEditPurchase?: (purchase: InvestmentPurchase, accountId: string, holdingName: string) => void
  onDeletePurchase?: (purchase: InvestmentPurchase, accountId: string, holdingName: string) => void
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
  onEditPurchase,
  onDeletePurchase,
}: InvestmentHoldingsSectionProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

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
        Merged positions with latest purchase activity. Click a holding to view individual purchases.
      </p>

      <div className="mt-4 space-y-4">
        {accounts.map((acc, idx) => {
          const filtered = acc.holdings.filter((h) =>
            matchesSearch(searchQuery, h.name, acc.name, acc.bankName),
          )

          return (
            <article
              key={`${acc.id}-${idx}`}
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
                    const holdingKey = `${acc.id}-${h.name}`
                    const isExpanded = expanded.has(holdingKey)

                    return (
                      <li key={holdingKey} className="py-3 first:pt-0">
                        <button
                          type="button"
                          onClick={() => toggle(holdingKey)}
                          className={cn(
                            "flex w-full flex-wrap items-center justify-between gap-3 text-left",
                            consoleFocus,
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5 shrink-0" style={{ color: TOKENS.onSurfaceMuted }} />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 shrink-0" style={{ color: TOKENS.onSurfaceMuted }} />
                            )}
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
                        </button>

                        {isExpanded && h.purchases.length > 0 ? (
                          <div
                            className="mt-3 rounded-lg border p-3"
                            style={{
                              borderColor: `color-mix(in srgb, ${TOKENS.outlineGhost} 60%, transparent)`,
                              background: TOKENS.surfaceContainer,
                            }}
                          >
                            <p
                              className="mb-2 text-[10px] font-semibold uppercase tracking-wider"
                              style={{ color: TOKENS.onSurfaceMuted }}
                            >
                              Purchase history ({h.purchases.length})
                            </p>
                            <ul className="space-y-2">
                              {h.purchases.map((p) => (
                                <li
                                  key={p.id}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-2.5 py-2"
                                  style={{
                                    background: TOKENS.surfaceLow,
                                    border: `1px solid color-mix(in srgb, ${TOKENS.outlineGhost} 50%, transparent)`,
                                  }}
                                >
                                  <div className="min-w-0">
                                    <p className="text-xs tabular-nums" style={{ color: TOKENS.onSurface }}>
                                      {formatInvestmentDateShort(p.date)}
                                    </p>
                                    <p className="text-[10px] tabular-nums" style={{ color: TOKENS.onSurfaceMuted }}>
                                      {p.numberOfShares ?? "—"} shares @ {p.pricePerUnit != null ? formatCurrency(p.pricePerUnit) : "—"}
                                      {p.brokerageFee > 0 ? ` + ${formatCurrency(p.brokerageFee)} fee` : ""}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <p
                                      className="text-xs font-semibold tabular-nums"
                                      style={{ color: TOKENS.secondary }}
                                    >
                                      {formatCurrency(p.amount)}
                                    </p>
                                    {onEditPurchase ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          onEditPurchase(p, acc.id, h.name)
                                        }}
                                        className={cn(
                                          "rounded-md p-1.5 transition-colors hover:bg-white/10",
                                          consoleFocus,
                                        )}
                                        style={{ color: TOKENS.onSurfaceMuted }}
                                        aria-label={`Edit purchase on ${formatInvestmentDateShort(p.date)}`}
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                    ) : null}
                                    {onDeletePurchase ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          onDeletePurchase(p, acc.id, h.name)
                                        }}
                                        className={cn(
                                          "rounded-md p-1.5 transition-colors hover:bg-white/10",
                                          consoleFocus,
                                        )}
                                        style={{ color: ERROR_SOFT }}
                                        aria-label={`Delete purchase on ${formatInvestmentDateShort(p.date)}`}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    ) : null}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
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
