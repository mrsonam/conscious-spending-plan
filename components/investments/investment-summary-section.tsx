"use client"

import { Activity, Banknote, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import {
  consoleFocus,
  consoleHeroFigureClass,
  consoleHeroFigureInnerClass,
} from "@/components/wealth-console/console-ui"
import { investmentPlBadgeStyle } from "@/components/investments/investment-console-ui"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "@/lib/income-page-types"
type PortfolioGains = {
  totalCostBasis: number
  totalGainLoss: number
  totalGainLossPercent: number
}

type InvestmentSummarySectionProps = {
  totalHoldings: number
  portfolioMarkValue: number
  portfolioGains: PortfolioGains
  dividendYtd: number
  dividendAllTime: number
  lastUpdated: Date | null
  totalInvested: number
  totalCash: number
  formatCurrency: (amount: number) => string
  onLogDividend: () => void
  onAddInvestment: () => void
}

export function InvestmentSummarySection({
  totalHoldings,
  portfolioMarkValue,
  portfolioGains,
  dividendYtd,
  dividendAllTime,
  lastUpdated,
  totalInvested,
  totalCash,
  formatCurrency,
  onLogDividend,
  onAddInvestment,
}: InvestmentSummarySectionProps) {
  return (
    <>
      <section
        className="px-1 py-2 sm:px-2"
        aria-labelledby="investment-portfolio-heading"
      >
        <h2 id="investment-portfolio-heading" className="sr-only">
          Portfolio overview
        </h2>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div
            className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.16em]"
            style={{
              borderColor: TOKENS.outlineGhost,
              color: TOKENS.secondary,
              background: TOKENS.surfaceHigh,
            }}
          >
            <Activity className="h-3.5 w-3.5" aria-hidden />
            {totalHoldings} positions
          </div>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.24em]"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Total portfolio value
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <span className={consoleHeroFigureClass}>
                <MajorFigureCurrency
                  amount={portfolioMarkValue}
                  variant="prosperity"
                  colorDecimal={TOKENS.secondary}
                  className={consoleHeroFigureInnerClass}
                  decimalEm={0.45}
                />
              </span>
              {portfolioGains.totalCostBasis > 0 ? (
                <span
                  className="mb-1 inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold tabular-nums"
                  style={investmentPlBadgeStyle(
                    portfolioGains.totalGainLossPercent >= 0,
                  )}
                >
                  {portfolioGains.totalGainLossPercent >= 0 ? "+" : ""}
                  {portfolioGains.totalGainLossPercent.toFixed(1)}% (P/L)
                </span>
              ) : (
                <span
                  className="mb-1 inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold"
                  style={{
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurfaceMuted,
                  }}
                >
                  P/L n/a
                </span>
              )}
            </div>
            <p
              className="mt-2 text-[11px] tabular-nums"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Dividend income (YTD){" "}
              <span className="font-semibold" style={{ color: TOKENS.primary }}>
                {formatCurrency(dividendYtd)}
              </span>
              {dividendAllTime > dividendYtd ? (
                <span className="ml-2 opacity-80">
                  · all-time {formatCurrency(dividendAllTime)}
                </span>
              ) : null}
            </p>
            <p
              className="mt-1 text-[11px] tabular-nums"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Last market refresh{" "}
              {lastUpdated
                ? lastUpdated.toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "-"}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onLogDividend}
              className={cn(
                "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold uppercase tracking-[0.18em]",
                consoleFocus,
              )}
              style={{
                borderColor: TOKENS.outlineGhost,
                color: TOKENS.secondary,
                background: TOKENS.surfaceHigh,
              }}
            >
              <Banknote className="h-4 w-4" aria-hidden />
              Log dividend
            </button>
            <button
              type="button"
              onClick={onAddInvestment}
              className={cn(
                "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-[0.18em]",
                consoleFocus,
              )}
              style={{
                background: TOKENS.primary,
                color: TOKENS.surface,
                boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
              }}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add investment
            </button>
          </div>
        </div>
      </section>

      <section
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        aria-labelledby="investment-metrics-heading"
      >
        <h2 id="investment-metrics-heading" className="sr-only">
          Portfolio metrics
        </h2>
        <MetricCard label="Invested">
          <MajorFigureCurrency
            amount={totalInvested}
            variant="income"
            className="text-xl font-bold! sm:text-2xl!"
            decimalEm={0.45}
          />
        </MetricCard>
        <MetricCard label="Available cash">
          <MajorFigureCurrency
            amount={totalCash}
            variant="neutral"
            className="text-xl font-bold! sm:text-2xl!"
            decimalEm={0.45}
          />
        </MetricCard>
        <MetricCard label="Dividend income (YTD)" footer="Cash credited to brokerage accounts">
          <MajorFigureCurrency
            amount={dividendYtd}
            variant="prosperity"
            colorDecimal={TOKENS.primary}
            className="text-xl font-bold! sm:text-2xl!"
            decimalEm={0.45}
          />
        </MetricCard>
        <MetricCard label="Profit / loss">
          {portfolioGains.totalCostBasis > 0 ? (
            <>
              <MajorFigureCurrency
                amount={portfolioGains.totalGainLoss}
                variant={portfolioGains.totalGainLoss >= 0 ? "prosperity" : "loss"}
                colorDecimal={
                  portfolioGains.totalGainLoss >= 0
                    ? TOKENS.secondary
                    : TOKENS.onSurfaceMuted
                }
                className="text-xl font-bold! sm:text-2xl!"
                decimalEm={0.45}
              />
              <p
                className="mt-1.5 text-[11px] tabular-nums"
                style={{
                  color:
                    portfolioGains.totalGainLossPercent >= 0
                      ? TOKENS.primary
                      : ERROR_SOFT,
                }}
              >
                {portfolioGains.totalGainLossPercent >= 0 ? "+" : ""}
                {portfolioGains.totalGainLossPercent.toFixed(2)}% on priced holdings
              </p>
            </>
          ) : (
            <>
              <span
                className="text-xl font-bold tabular-nums"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                -
              </span>
              <p className="mt-1.5 text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>
                Add priced positions to see P/L
              </p>
            </>
          )}
        </MetricCard>
      </section>
    </>
  )
}

function MetricCard({
  label,
  footer,
  children,
}: {
  label: string
  footer?: string
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
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.22em]"
        style={{ color: TOKENS.onSurfaceMuted }}
      >
        {label}
      </p>
      <div className="mt-2">{children}</div>
      {footer ? (
        <p className="mt-1.5 text-[10px]" style={{ color: TOKENS.onSurfaceMuted }}>
          {footer}
        </p>
      ) : null}
    </div>
  )
}
