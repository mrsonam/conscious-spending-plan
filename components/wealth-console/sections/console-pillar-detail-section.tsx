"use client"

import { Building2, Coffee, PiggyBank, TrendingUp } from "lucide-react"
import { BENTO } from "@/lib/app-routes"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import {
  ScrambleCurrencyValue,
  ScrambleIntegerValue,
  ScramblePercentValue,
} from "@/components/ui/scramble-number"
import { SkeletonBlock } from "@/components/wealth-console/console-skeleton"
import { DetailCard, DetailCardSkeleton } from "@/components/wealth-console/detail-card"
import type { WealthConsoleDashboardVM } from "@/components/wealth-console/use-wealth-console-derived"

export function ConsolePillarDetailSection({ vm }: { vm: WealthConsoleDashboardVM }) {
  const {
    fixedRows,
    guiltRows,
    investmentRows,
    savingsDisplayRows,
    breakdownData,
    showBreakdownSkeleton,
    showInvestmentMonthSkeleton,
    investmentAllocated,
  } = vm


  return (
    <>
            <div
              id="console-spending"
              className="scroll-mt-28 mt-12 space-y-4 lg:space-y-5"
            >
              <h2 className="sr-only">Pillar detail</h2>
              <div className="lg:ml-[min(4vw,2rem)]">
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.28em]"
                  style={{ color: TOKENS.onSurfaceMutedElevated }}
                >
                  Pillar detail
                </p>
                <p
                  className="mt-2 text-xs leading-relaxed sm:text-sm"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Line items for the current calendar month
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
                <div className="lg:col-span-7">
                  {showBreakdownSkeleton ? (
                    <DetailCardSkeleton
                      title="Fixed Costs"
                      icon={Building2}
                      accent={TOKENS.secondary}
                      size="hero"
                    />
                  ) : (
                    <DetailCard
                      title="Fixed Costs"
                      total={breakdownData.fixedCosts}
                      icon={Building2}
                      rows={fixedRows}
                      accent={TOKENS.secondary}
                      size="hero"
                      detailHref={BENTO.expenses}
                    />
                  )}
                </div>
                <div className="lg:col-span-5">
                  {showBreakdownSkeleton ? (
                    <DetailCardSkeleton
                      title="Savings"
                      icon={PiggyBank}
                      accent={TOKENS.primary}
                      size="compact"
                    />
                  ) : (
                    <DetailCard
                      title="Savings"
                      total={breakdownData.savings}
                      icon={PiggyBank}
                      rows={savingsDisplayRows}
                      accent={TOKENS.primary}
                      size="compact"
                      detailHref={BENTO.funds}
                    />
                  )}
                </div>
                <div className="lg:col-span-5">
                  {showBreakdownSkeleton ? (
                    <DetailCardSkeleton
                      title="Investment"
                      icon={TrendingUp}
                      accent={TOKENS.tertiary}
                      size="compact"
                    />
                  ) : (
                    <DetailCard
                      title="Investment"
                      total={breakdownData.investment}
                      icon={TrendingUp}
                      detailHref={BENTO.investments}
                      rows={
                        investmentRows.length > 0
                          ? investmentRows
                          : breakdownData.investment > 0
                            ? [
                                {
                                  label: "Allocated this month",
                                  amount: breakdownData.investment,
                                },
                              ]
                            : []
                      }
                      accent={TOKENS.tertiary}
                      size="compact"
                    />
                  )}
                </div>
                <div className="lg:col-span-7">
                  {showBreakdownSkeleton ? (
                    <DetailCardSkeleton
                      title="Guilt-Free"
                      icon={Coffee}
                      accent={TOKENS.primary}
                      size="hero"
                    />
                  ) : (
                    <DetailCard
                      title="Guilt-Free"
                      total={breakdownData.guiltFreeSpending}
                      icon={Coffee}
                      rows={guiltRows}
                      accent={TOKENS.primary}
                      size="hero"
                      detailHref={BENTO.expenses}
                    />
                  )}
                </div>
              </div>
            </div>
    </>
  )
}
