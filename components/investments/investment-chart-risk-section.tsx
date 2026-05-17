"use client"

import dynamic from "next/dynamic"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { consoleFocus } from "@/components/wealth-console/console-ui"
import type { ChartRange, PortfolioChartPoint } from "@/components/investments/investment-shared"

const InvestmentPortfolioChart = dynamic(
  () =>
    import("@/components/investments/investment-portfolio-chart").then(
      (m) => m.InvestmentPortfolioChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[240px] w-full min-h-[220px] rounded-lg sm:h-[280px]"
        style={{ background: TOKENS.surfaceLow, border: `1px solid ${TOKENS.outlineGhost}` }}
        aria-hidden
      />
    ),
  },
)

type InvestmentChartRiskSectionProps = {
  chartSubtitle: string
  chartRange: ChartRange
  onChartRangeChange: (range: ChartRange) => void
  portfolioChartData: PortfolioChartPoint[]
  formatCurrency: (amount: number) => string
  liquidityPct: number
  concentrationStdev: number
  sovereignInsight: string
  loadingMarketPrices: boolean
  onRefreshPrices: () => void
}

export function InvestmentChartRiskSection({
  chartSubtitle,
  chartRange,
  onChartRangeChange,
  portfolioChartData,
  formatCurrency,
  liquidityPct,
  concentrationStdev,
  sovereignInsight,
  loadingMarketPrices,
  onRefreshPrices,
}: InvestmentChartRiskSectionProps) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-12">
      <section
        className="rounded-xl border p-4 sm:p-5 lg:col-span-8"
        style={{
          background: TOKENS.surfaceContainer,
          borderColor: TOKENS.outlineGhost,
          boxShadow: CARD_INSET,
        }}
        aria-labelledby="investment-chart-heading"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              id="investment-chart-heading"
              className="text-[10px] font-semibold uppercase tracking-[0.28em]"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Portfolio value
            </h2>
            <p className="mt-1 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
              {chartSubtitle}
            </p>
          </div>
          <div
            role="group"
            aria-label="Chart time range"
            className="inline-flex flex-wrap gap-1 rounded-xl p-1"
            style={{ background: TOKENS.surfaceHigh, boxShadow: CARD_INSET }}
          >
            {(["1W", "3M", "1Y", "ALL"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onChartRangeChange(r)}
                className={cn(
                  "min-h-11 rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em]",
                  consoleFocus,
                )}
                style={{
                  color: chartRange === r ? TOKENS.primary : TOKENS.onSurfaceMuted,
                  background: chartRange === r ? TOKENS.surfaceContainer : "transparent",
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <InvestmentPortfolioChart
            data={portfolioChartData}
            formatCurrency={formatCurrency}
          />
        </div>
        <p className="mt-2 text-[10px]" style={{ color: TOKENS.onSurfaceMuted }}>
          Curve uses cumulative purchases through each day, then snaps to current
          portfolio value (cash plus holdings at live prices where available, else
          cost).
        </p>
      </section>

      <aside
        className="flex flex-col gap-4 rounded-xl border p-4 sm:p-5 lg:col-span-4"
        style={{
          background: TOKENS.surfaceContainer,
          borderColor: TOKENS.outlineGhost,
          boxShadow: CARD_INSET,
        }}
        aria-labelledby="investment-risk-heading"
      >
        <h2
          id="investment-risk-heading"
          className="text-[10px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: TOKENS.onSurfaceMuted }}
        >
          Risk profile
        </h2>
        <div>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span style={{ color: TOKENS.onSurfaceMuted }}>Liquidity coverage</span>
            <span className="font-bold tabular-nums" style={{ color: TOKENS.onSurface }}>
              {liquidityPct.toFixed(1)}%
            </span>
          </div>
          <div
            className="mt-2 flex h-2 overflow-hidden rounded-full"
            style={{ background: TOKENS.surfaceHigh }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, liquidityPct)}%`,
                background: TOKENS.primary,
              }}
            />
          </div>
          <p
            className="mt-1 text-[10px] font-semibold uppercase"
            style={{ color: TOKENS.secondary }}
          >
            {liquidityPct >= 15 ? "Optimal" : liquidityPct >= 5 ? "Moderate" : "Lean"}
          </p>
        </div>
        <div>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span style={{ color: TOKENS.onSurfaceMuted }}>Concentration (σ of weights)</span>
            <span className="font-bold tabular-nums" style={{ color: TOKENS.onSurface }}>
              {concentrationStdev.toFixed(1)}
            </span>
          </div>
          <div
            className="mt-2 flex h-2 overflow-hidden rounded-full"
            style={{ background: TOKENS.surfaceHigh }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, concentrationStdev * 2)}%`,
                background: TOKENS.secondary,
              }}
            />
          </div>
          <p
            className="mt-1 text-[10px] font-semibold uppercase"
            style={{ color: TOKENS.secondary }}
          >
            {concentrationStdev < 18
              ? "Diversified"
              : concentrationStdev < 28
                ? "Moderate"
                : "Concentrated"}
          </p>
        </div>
        <div
          className="rounded-lg border p-3 text-xs leading-relaxed"
          style={{
            borderColor: TOKENS.outlineGhost,
            background: TOKENS.surfaceLow,
            color: TOKENS.onSurfaceMuted,
          }}
        >
          <span
            className="font-semibold uppercase tracking-wider"
            style={{ color: TOKENS.primary }}
          >
            Console insight
          </span>
          <p className="mt-2">{sovereignInsight}</p>
        </div>
        <button
          type="button"
          onClick={onRefreshPrices}
          disabled={loadingMarketPrices}
          className={cn(
            "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] disabled:opacity-60",
            consoleFocus,
          )}
          style={{
            borderColor: TOKENS.outlineGhost,
            color: TOKENS.secondary,
            background: TOKENS.surfaceLow,
          }}
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", loadingMarketPrices && "animate-spin")}
          />
          Refresh prices
        </button>
      </aside>
    </div>
  )
}
