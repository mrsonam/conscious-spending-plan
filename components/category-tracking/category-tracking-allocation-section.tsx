"use client"

import { Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import {
  TRACKING_FUND_CATEGORIES,
  type TrackingFundKey,
} from "@/lib/category-tracking-shared"
import {
  CategoryTrackingBarProgress,
  pillarSegmentColor,
} from "@/components/category-tracking/category-tracking-console-ui"

function pctOf(whole: number, part: number) {
  if (!whole || whole <= 0) return 0
  return (part / whole) * 100
}

type AllocationMixItem = { key: string; amount: number }
type DistributionItem = { name: string; value: number; color: string }

type CategoryTrackingAllocationSectionProps = {
  allocationMix: AllocationMixItem[]
  totalIncomeForMonth: number | null
  selectedMonthLabel: string
  formatCurrency: (amount: number) => string
  categoryDistribution: DistributionItem[]
  spendMixTotal: number
}

export function CategoryTrackingAllocationSection({
  allocationMix,
  totalIncomeForMonth,
  selectedMonthLabel,
  formatCurrency,
  categoryDistribution,
  spendMixTotal,
}: CategoryTrackingAllocationSectionProps) {
  const CATEGORIES = TRACKING_FUND_CATEGORIES
  const showSpendMix = categoryDistribution.length > 0 && spendMixTotal > 0

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-5">
      <div
        className={cn(
          "rounded-xl border p-5 sm:p-6 lg:p-7",
          showSpendMix ? "lg:col-span-8" : "lg:col-span-12",
        )}
        style={{
          background: TOKENS.surfaceContainer,
          borderColor: TOKENS.outlineGhost,
          boxShadow: CARD_INSET,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
              Allocation schema
            </h3>
            <p className="mt-1 text-xs italic" style={{ color: TOKENS.onSurfaceMuted }}>
              {selectedMonthLabel} split of recognized income
            </p>
          </div>
          <Activity className="h-5 w-5 shrink-0" style={{ color: TOKENS.secondary }} />
        </div>

        {allocationMix.length > 0 && totalIncomeForMonth ? (
          <>
            <div
              className="mt-5 flex h-2.5 w-full min-w-0 overflow-hidden rounded-full"
              style={{ background: TOKENS.surfaceHigh }}
              role="img"
              aria-label="Allocation split across pillars"
            >
              {allocationMix.map((a) => {
                const w = totalIncomeForMonth > 0 ? Math.max(0, (a.amount / totalIncomeForMonth) * 100) : 0
                if (w <= 0) return null
                return (
                  <div
                    key={a.key}
                    className="min-w-[2px] shrink-0"
                    style={{
                      width: `${w}%`,
                      background: pillarSegmentColor(a.key as TrackingFundKey),
                    }}
                  />
                )
              })}
            </div>

            <table className="sr-only">
              <caption>Allocation by fund pillar for {selectedMonthLabel}</caption>
              <thead>
                <tr>
                  <th scope="col">Pillar</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Share of income</th>
                </tr>
              </thead>
              <tbody>
                {allocationMix.map((a) => {
                  const cat = CATEGORIES.find((c) => c.key === a.key)
                  const pct = pctOf(totalIncomeForMonth, a.amount)
                  return (
                    <tr key={a.key}>
                      <td>{cat?.label ?? a.key}</td>
                      <td>{formatCurrency(a.amount)}</td>
                      <td>{pct.toFixed(1)}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {allocationMix.map((a) => {
                const cat = CATEGORIES.find((c) => c.key === a.key)
                const pct = pctOf(totalIncomeForMonth, a.amount)
                const filled = Math.round((pct / 100) * 12)
                const pillarColor = pillarSegmentColor(a.key as TrackingFundKey)
                return (
                  <div
                    key={a.key}
                    className="rounded-xl border px-3 py-3"
                    style={{
                      borderColor: TOKENS.outlineGhost,
                      background: TOKENS.surfaceLow,
                      boxShadow: CARD_INSET,
                    }}
                  >
                    <p
                      className="text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: TOKENS.onSurfaceMuted }}
                    >
                      {cat?.label ?? a.key}
                    </p>
                    <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
                      <MajorFigureCurrency
                        amount={a.amount}
                        variant="neutral"
                        className="text-base font-bold!"
                        decimalEm={0.45}
                      />
                      <span className="tabular-nums text-xs font-medium" style={{ color: TOKENS.tertiary }}>
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-2 flex gap-1">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <span
                          key={i}
                          className="h-2 w-3 rounded-[4px]"
                          style={{
                            background:
                              i < filled
                                ? pillarColor
                                : `color-mix(in srgb, ${TOKENS.onSurfaceMuted} 22%, ${TOKENS.surfaceLow})`,
                            opacity: i < filled ? 1 : 0.55,
                            boxShadow: i < filled ? CARD_INSET : undefined,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <p className="mt-5 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
            No allocation to visualize. Income or balances may be zero.
          </p>
        )}
      </div>

      {showSpendMix ? (
        <div
          className="h-fit rounded-xl border p-4 sm:p-5 lg:col-span-4"
          style={{
            background: TOKENS.surfaceContainer,
            borderColor: TOKENS.outlineGhost,
            boxShadow: CARD_INSET,
          }}
        >
          <p className="text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
            Spend mix
          </p>
          <p className="mt-1 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
            {selectedMonthLabel} · share of spend by fund
          </p>
          <div className="mt-3 space-y-2.5">
            {categoryDistribution.map((d) => {
              const pct = spendMixTotal > 0 ? (d.value / spendMixTotal) * 100 : 0
              return (
                <div key={d.name}>
                  <div className="flex items-center justify-between gap-2 text-[11px] leading-tight">
                    <span style={{ color: TOKENS.onSurface }}>{d.name}</span>
                    <span className="tabular-nums font-semibold" style={{ color: TOKENS.onSurface }}>
                      {formatCurrency(d.value)}{" "}
                      <span style={{ color: TOKENS.onSurfaceMuted }}>({pct.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <CategoryTrackingBarProgress
                    percent={pct}
                    color={d.color}
                    label={`${d.name} ${pct.toFixed(0)} percent of spend mix`}
                  />
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
