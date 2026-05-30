"use client"

import { ArrowRightLeft } from "lucide-react"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import {
  TRACKING_FUND_CATEGORIES,
  trackingFundShort,
} from "@/lib/category-tracking-shared"
import type { CategoryBucketTransferApiRow } from "@/lib/category-bucket-transfer-api"

type CategoryTrackingBucketTransfersSectionProps = {
  transfers: CategoryBucketTransferApiRow[]
  selectedMonthLabel: string
  formatDate: (date: string) => string
}

function categoryColor(key: string): string {
  return TRACKING_FUND_CATEGORIES.find((c) => c.key === key)?.colorHex ?? TOKENS.primary
}

export function CategoryTrackingBucketTransfersSection({
  transfers,
  selectedMonthLabel,
  formatDate,
}: CategoryTrackingBucketTransfersSectionProps) {
  if (transfers.length === 0) {
    return null
  }

  return (
    <div
      className="w-full min-w-0 rounded-xl border p-5 sm:p-6"
      style={{
        background: TOKENS.surfaceContainer,
        borderColor: TOKENS.outlineGhost,
        boxShadow: CARD_INSET,
      }}
    >
      <div className="flex items-start gap-2">
        <ArrowRightLeft className="mt-0.5 h-4 w-4 shrink-0" style={{ color: TOKENS.primary }} aria-hidden />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.primary }}>
            Envelope moves
          </p>
          <p className="mt-1 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
            {transfers.length} bucket {transfers.length === 1 ? "transfer" : "transfers"} in {selectedMonthLabel}
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {transfers.map((t) => (
          <li
            key={t.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-3 sm:px-4"
            style={{
              borderColor: TOKENS.outlineGhost,
              background: TOKENS.surfaceLow,
            }}
          >
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold" style={{ color: categoryColor(t.fromCategory) }}>
                {trackingFundShort(t.fromCategory)}
              </span>
              <ArrowRightLeft className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
              <span className="font-semibold" style={{ color: categoryColor(t.toCategory) }}>
                {trackingFundShort(t.toCategory)}
              </span>
              <span style={{ color: TOKENS.onSurfaceMuted }}>
                · {formatDate(t.createdAt)}
              </span>
            </div>
            <MajorFigureCurrency
              amount={t.amount}
              variant="income"
              className="text-sm font-bold tabular-nums"
              decimalEm={0.4}
            />
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[11px] leading-snug" style={{ color: TOKENS.onSurfaceMuted }}>
        Plan-level moves between pillars — not bank transfers. Totals stay in deployable balance.
      </p>
    </div>
  )
}
