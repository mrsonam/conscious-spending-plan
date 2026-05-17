"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { ScrambleCurrencyValue } from "@/components/ui/scramble-number"
import { TrajectorySparkline } from "@/components/wealth-console/trajectory-sparkline"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { consoleOverviewFigureClass } from "@/components/wealth-console/console-ui"
import type { WealthConsoleDashboardVM } from "@/components/wealth-console/use-wealth-console-derived"

export function ConsoleOverviewSection({
  vm,
  children,
}: {
  vm: WealthConsoleDashboardVM
  children: ReactNode
}) {
  const { formatCurrency } = useFormatCurrency()
  const {
    breakdownData,
    netSavings,
    changeLabel,
    showBreakdownSkeleton,
    trajectorySeries,
    incomeChangePct,
    loading,
  } = vm

  return (
    <div id="console-overview" className="scroll-mt-28 space-y-10">
      <h2 className="sr-only">Overview</h2>
      <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-4">
          {showBreakdownSkeleton ? (
            <div aria-hidden>
              <p
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: TOKENS.onSurfaceMutedElevated }}
              >
                Monthly income
              </p>
              <div className={cn("mt-1", consoleOverviewFigureClass)}>
                <ScrambleCurrencyValue variant="income" />
              </div>
            </div>
          ) : (
            <>
              <p
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: TOKENS.onSurfaceMutedElevated }}
              >
                Monthly income
              </p>
              <div className={cn("mt-1", consoleOverviewFigureClass)}>
                <MajorFigureCurrency
                  amount={breakdownData.income}
                  variant="income"
                />
              </div>
            </>
          )}
        </div>
        <div className="lg:col-span-4">
          {showBreakdownSkeleton ? (
            <div aria-hidden>
              <p
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: TOKENS.onSurfaceMutedElevated }}
              >
                Net savings
              </p>
              <div className={cn("mt-1", consoleOverviewFigureClass)}>
                <ScrambleCurrencyValue variant="prosperity" />
              </div>
            </div>
          ) : (
            <>
              <p
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: TOKENS.onSurfaceMutedElevated }}
              >
                Net savings
              </p>
              <div className={cn("mt-1", consoleOverviewFigureClass)}>
                <MajorFigureCurrency
                  amount={netSavings}
                  variant={netSavings >= 0 ? "prosperity" : "loss"}
                />
              </div>
            </>
          )}
        </div>
        <div className="lg:col-span-4">
          <div
            className="rounded-xl p-4"
            style={{
              background: TOKENS.surfaceContainer,
              boxShadow: "inset 0 1px 0 0 rgba(218,226,253,0.06)",
            }}
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: TOKENS.onSurfaceMutedElevated }}
            >
              Plan trajectory
            </p>
            <div className="mt-2 flex items-center justify-between gap-3">
              {loading && trajectorySeries.length === 0 ? (
                <>
                  <div
                    className="h-11 w-[140px] rounded-md"
                    style={{ background: TOKENS.surfaceLow }}
                  />
                  <div
                    className="h-8 w-28 rounded-md"
                    style={{ background: TOKENS.surfaceLow }}
                  />
                </>
              ) : (
                <>
                  <TrajectorySparkline series={trajectorySeries} />
                  <p className="sr-only">
                    {trajectorySeries.length < 2
                      ? "Plan trajectory: not enough history to chart yet."
                      : `Plan trajectory over ${trajectorySeries.length} months, combined category remaining from ${formatCurrency(trajectorySeries[0]?.value ?? 0)} to ${formatCurrency(trajectorySeries[trajectorySeries.length - 1]?.value ?? 0)}.`}
                  </p>
                  <p
                    className="text-right text-sm font-semibold tabular-nums leading-tight"
                    style={{
                      color:
                        incomeChangePct !== null && incomeChangePct >= 0
                          ? TOKENS.primary
                          : incomeChangePct !== null
                            ? TOKENS.loss
                            : TOKENS.onSurface,
                    }}
                  >
                    {changeLabel}
                  </p>
                </>
              )}
            </div>
            <p
              className="mt-2 text-[10px] leading-snug"
              style={{ color: TOKENS.onSurfaceMutedElevated }}
            >
              Combined category remaining, last 6 months
            </p>
          </div>
        </div>
      </div>
      {children}
    </div>
  )
}
