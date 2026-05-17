"use client"

import Link from "next/link"
import { TrendingDown, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "@/lib/income-page-types"
import { CategoryTrackingSegmentedBlocks } from "@/components/category-tracking/category-tracking-console-ui"
import {
  consoleHeroFigureClass,
  consoleHeroFigureInnerClass,
} from "@/components/wealth-console/console-ui"
import { BENTO } from "@/lib/app-routes"

type MomSpend = { delta: number; pct: number | null } | null

type CategoryTrackingHeroSectionProps = {
  totalRemaining: number
  totalIncomeForMonth: number | null
  totalAllocated: number
  totalSpent: number
  overallUsage: number
  runwayPct: number
  momSpend: MomSpend
  selectedMonthLabel: string
  formatCurrency: (amount: number) => string
}

export function CategoryTrackingHeroSection({
  totalRemaining,
  totalIncomeForMonth,
  totalAllocated,
  totalSpent,
  overallUsage,
  runwayPct,
  momSpend,
  selectedMonthLabel,
  formatCurrency,
}: CategoryTrackingHeroSectionProps) {
  const momGood = momSpend === null ? null : momSpend.delta <= 0

  return (
    <section className="lg:col-span-7">
      <div className="px-1 py-2 sm:px-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: TOKENS.primary, boxShadow: CARD_INSET }}
            />
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.28em]"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Live fund telemetry
            </p>
          </div>
          <div
            className="inline-flex items-center rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{
              background: `color-mix(in srgb, ${
                momSpend === null
                  ? TOKENS.onSurfaceMuted
                  : momGood
                    ? TOKENS.primary
                    : ERROR_SOFT
              } 18%, ${TOKENS.surfaceLow})`,
              border: `1px solid ${TOKENS.outlineGhost}`,
              color:
                momSpend === null
                  ? TOKENS.onSurfaceMuted
                  : momGood
                    ? TOKENS.primary
                    : ERROR_SOFT,
              boxShadow: CARD_INSET,
            }}
          >
            {momSpend ? (
              <>
                {momGood ? (
                  <TrendingDown className="mr-2 h-4 w-4" strokeWidth={2} />
                ) : (
                  <TrendingUp className="mr-2 h-4 w-4" strokeWidth={2} />
                )}
                {momSpend.delta > 0 ? "+" : ""}
                {formatCurrency(momSpend.delta)}
                <span className="ml-1.5 opacity-80">6-mo hist vs prior</span>
                {momSpend.pct != null && (
                  <span className="ml-1 opacity-75">
                    ({momSpend.pct > 0 ? "+" : ""}
                    {momSpend.pct.toFixed(1)}%)
                  </span>
                )}
              </>
            ) : (
              <span aria-hidden>—</span>
            )}
          </div>
        </div>

        <p
          className="mt-3 text-[10px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: TOKENS.onSurfaceMuted }}
        >
          Deployable balance
        </p>
        <div className={cn("mt-2", consoleHeroFigureClass)}>
          <MajorFigureCurrency
            amount={totalRemaining}
            variant="prosperity"
            className={consoleHeroFigureInnerClass}
            decimalEm={0.45}
          />
        </div>
        <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: TOKENS.onSurfaceMuted }}>
          Headroom left inside your four pillars for{" "}
          <span style={{ color: TOKENS.onSurface }}>{selectedMonthLabel}</span>. Route spend on{" "}
          <Link
            href={BENTO.expenses}
            className="font-semibold underline-offset-2 hover:underline"
            style={{ color: TOKENS.primary }}
          >
            Expenses
          </Link>{" "}
          so each line inherits a fund tag.
        </p>

        <div className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Budget drawdown
              </p>
              <p className="mt-1 text-xs italic" style={{ color: TOKENS.onSurfaceMuted }}>
                Consumption vs envelopes (allocated)
              </p>
            </div>
            <p className="text-lg font-bold tabular-nums" style={{ color: TOKENS.onSurface }}>
              {overallUsage.toFixed(1)}%
            </p>
          </div>
          <CategoryTrackingSegmentedBlocks
            percent={overallUsage}
            activeColor={TOKENS.primary}
            label={`Budget drawdown ${overallUsage.toFixed(1)} percent`}
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider">
            <span style={{ color: TOKENS.onSurfaceMuted }}>Residual runway</span>
            <span style={{ color: runwayPct > 35 ? TOKENS.primary : ERROR_SOFT }}>
              {runwayPct.toFixed(0)}% unspent
            </span>
          </div>
        </div>

        <div
          className="mt-8 grid grid-cols-1 gap-6 border-t pt-6 sm:grid-cols-3"
          style={{ borderColor: TOKENS.outlineGhost }}
        >
          <div>
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Income (month)
            </p>
            <div className="mt-2">
              <MajorFigureCurrency
                amount={totalIncomeForMonth ?? 0}
                variant="income"
                className="text-lg font-bold!"
                decimalEm={0.45}
              />
            </div>
          </div>
          <div>
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Envelope load
            </p>
            <div className="mt-2">
              <MajorFigureCurrency
                amount={totalAllocated}
                variant="neutral"
                className="text-lg font-bold!"
                decimalEm={0.45}
              />
            </div>
          </div>
          <div>
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Deployed
            </p>
            <div className="mt-2">
              <MajorFigureCurrency
                amount={totalSpent}
                variant="loss"
                className="text-lg font-bold!"
                decimalEm={0.45}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
