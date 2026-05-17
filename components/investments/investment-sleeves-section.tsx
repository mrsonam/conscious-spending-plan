"use client"

import { investmentSleeveActionClass } from "@/components/investments/investment-console-ui"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import type { InvestmentAccountSummary } from "@/components/investments/investment-shared"

type SleeveRow = { symbol: string; amount: number }

type InvestmentSleevesSectionProps = {
  topHoldingsList: SleeveRow[]
  totalInvested: number
  totalCash: number
  portfolioMarkValue: number
  accounts: InvestmentAccountSummary[]
  formatCurrency: (amount: number) => string
  onViewAnalytics: () => void
  onAddPosition: () => void
}

export function InvestmentSleevesSection({
  topHoldingsList,
  totalInvested,
  totalCash,
  portfolioMarkValue,
  accounts,
  formatCurrency,
  onViewAnalytics,
  onAddPosition,
}: InvestmentSleevesSectionProps) {
  return (
    <section
      className="grid gap-4 md:grid-cols-3"
      aria-labelledby="investment-sleeves-heading"
    >
      <h2 id="investment-sleeves-heading" className="sr-only">
        Allocation sleeves
      </h2>
      <SleeveCard
        title="Core positions"
        badge={
          totalInvested > 0 && topHoldingsList[0]
            ? `${((topHoldingsList[0].amount / totalInvested) * 100).toFixed(0)}%`
            : "—"
        }
        badgeColor={TOKENS.primary}
      >
        <ul className="mt-3 space-y-2">
          {topHoldingsList.slice(0, 3).map((row) => (
            <li key={row.symbol} className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold" style={{ color: TOKENS.onSurface }}>
                {row.symbol}
              </span>
              <span className="tabular-nums" style={{ color: TOKENS.secondary }}>
                {formatCurrency(row.amount)}
              </span>
            </li>
          ))}
          {topHoldingsList.length === 0 ? (
            <li className="text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
              No positions yet.
            </li>
          ) : null}
        </ul>
        <button
          type="button"
          onClick={onViewAnalytics}
          className={investmentSleeveActionClass}
          style={{ color: TOKENS.secondary }}
        >
          View all assets
        </button>
      </SleeveCard>

      <SleeveCard title="Secondary sleeve" badge="Next tier" badgeColor={TOKENS.onSurfaceMuted}>
        <ul className="mt-3 space-y-2">
          {topHoldingsList.slice(3, 6).map((row) => (
            <li key={row.symbol} className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold" style={{ color: TOKENS.onSurface }}>
                {row.symbol}
              </span>
              <span className="tabular-nums" style={{ color: TOKENS.secondary }}>
                {formatCurrency(row.amount)}
              </span>
            </li>
          ))}
          {topHoldingsList.length <= 3 ? (
            <li className="text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
              Add more tickers to populate this sleeve.
            </li>
          ) : null}
        </ul>
        <button
          type="button"
          onClick={onAddPosition}
          className={investmentSleeveActionClass}
          style={{ color: TOKENS.secondary }}
        >
          Add position
        </button>
      </SleeveCard>

      <SleeveCard
        title="Cash & sweep"
        badge={
          portfolioMarkValue > 0
            ? `${((totalCash / portfolioMarkValue) * 100).toFixed(0)}%`
            : "—"
        }
        badgeColor={TOKENS.primary}
      >
        <ul className="mt-3 space-y-2">
          {accounts.map((acc) => (
            <li key={acc.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="min-w-0 truncate font-semibold" style={{ color: TOKENS.onSurface }}>
                {acc.name}
              </span>
              <span className="tabular-nums" style={{ color: TOKENS.secondary }}>
                {formatCurrency(acc.balance)}
              </span>
            </li>
          ))}
        </ul>
        <p
          className="mt-4 text-center text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{ color: TOKENS.onSurfaceMuted }}
        >
          Uninvested cash in brokerage accounts
        </p>
      </SleeveCard>
    </section>
  )
}

function SleeveCard({
  title,
  badge,
  badgeColor,
  children,
}: {
  title: string
  badge: string
  badgeColor: string
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        background: TOKENS.surfaceContainer,
        borderColor: TOKENS.outlineGhost,
        boxShadow: CARD_INSET,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: TOKENS.onSurfaceMuted }}
        >
          {title}
        </p>
        <span className="text-xs font-bold tabular-nums" style={{ color: badgeColor }}>
          {badge}
        </span>
      </div>
      {children}
    </div>
  )
}
