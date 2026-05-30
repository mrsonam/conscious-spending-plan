"use client"

import { cn } from "@/lib/utils"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "@/lib/income-page-types"
import {
  TRACKING_FUND_CATEGORIES,
  type CategoryTrackingRow,
} from "@/lib/category-tracking-shared"
import { CategoryTrackingSegmentedBlocks } from "@/components/category-tracking/category-tracking-console-ui"

type CategoryTrackingPillarSectionProps = {
  tracking: Record<string, CategoryTrackingRow>
  elapsed: number
  formatCurrency: (amount: number) => string
}

export function CategoryTrackingPillarSection({
  tracking,
  elapsed,
  formatCurrency,
}: CategoryTrackingPillarSectionProps) {
  const CATEGORIES = TRACKING_FUND_CATEGORIES

  return (
    <div>
      <p
        className="mb-3 text-[10px] font-semibold uppercase tracking-[0.28em]"
        style={{ color: TOKENS.onSurfaceMuted }}
      >
        Pillar matrix
      </p>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        {CATEGORIES.map((cat) => {
          const data = tracking[cat.key]
          if (!data) return null
          const isOverspent = data.overspent > 0
          const deployed =
            cat.key === "investment" ? data.transferred : data.spent
          const usageBase =
            cat.key === "investment"
              ? data.available > 0
                ? data.available
                : data.allocated + data.carryover
              : data.allocated
          const usagePercent = usageBase > 0 ? (deployed / usageBase) * 100 : 0
          const Icon = cat.Icon
          let paceLabel = "—"
          if (elapsed <= 0) paceLabel = "Future"
          else if (elapsed >= 1) paceLabel = "Closed"
          else {
            const paceRatio = usagePercent / (elapsed * 100)
            if (paceRatio > 1.15) paceLabel = "Hot"
            else if (paceRatio < 0.85) paceLabel = "Cool"
            else paceLabel = "Balanced"
          }
          const span =
            cat.key === "investment"
              ? "lg:col-span-6"
              : cat.key === "guiltFreeSpending"
                ? "lg:col-span-12"
                : "lg:col-span-3"

          return (
            <div
              key={cat.key}
              className={cn("rounded-xl border p-4 sm:p-5", span)}
              style={{
                background: TOKENS.surfaceLow,
                borderColor: isOverspent ? ERROR_SOFT : TOKENS.outlineGhost,
                boxShadow: CARD_INSET,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
                  {cat.label}
                </span>
                <Icon className="h-4 w-4 shrink-0" style={{ color: TOKENS.tertiary }} />
              </div>
              <div className="mt-3">
                <MajorFigureCurrency
                  amount={data.remaining}
                  variant={isOverspent ? "loss" : "prosperity"}
                  className="text-xl font-black sm:text-2xl!"
                  decimalEm={0.4}
                />
                <p
                  className="mt-1 text-[10px]"
                  style={{ color: isOverspent ? ERROR_SOFT : TOKENS.onSurfaceMuted }}
                >
                  {isOverspent ? `Breach ${formatCurrency(data.overspent)}` : "Residual"}
                </p>
              </div>
              <div className="mt-3 space-y-1 text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>
                <div className="flex justify-between">
                  <span>Envelope</span>
                  <span style={{ color: TOKENS.onSurface }}>{formatCurrency(data.allocated)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{cat.key === "investment" ? "Transferred" : "Spent"}</span>
                  <span style={{ color: ERROR_SOFT }}>{formatCurrency(deployed)}</span>
                </div>
                {(data.carryover > 0 || data.overspending > 0) && (
                  <div className="border-t pt-2" style={{ borderColor: TOKENS.outlineGhost }}>
                    {data.carryover > 0 && (
                      <div className="flex justify-between" style={{ color: TOKENS.primary }}>
                        <span>Carry</span>
                        <span>+{formatCurrency(data.carryover)}</span>
                      </div>
                    )}
                    {data.overspending > 0 && (
                      <div className="flex justify-between" style={{ color: ERROR_SOFT }}>
                        <span>Prior clawback</span>
                        <span>-{formatCurrency(data.overspending)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="mt-3 text-[10px]" style={{ color: TOKENS.onSurfaceMuted }}>
                Pace · <span style={{ color: TOKENS.onSurface }}>{paceLabel}</span>
                {elapsed > 0 && elapsed < 1 && (
                  <span> · {(elapsed * 100).toFixed(0)}% month</span>
                )}
              </p>
              <CategoryTrackingSegmentedBlocks
                percent={Math.min(100, usagePercent)}
                activeColor={isOverspent ? ERROR_SOFT : TOKENS.primary}
                label={`${cat.label} usage ${usagePercent.toFixed(0)} percent`}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
