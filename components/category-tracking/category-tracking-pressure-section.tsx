"use client"

import { TrendingDown, Wallet } from "lucide-react"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "@/lib/income-page-types"
import {
  CategoryTrackingBarProgress,
  CategoryTrackingSegmentedBlocks,
} from "@/components/category-tracking/category-tracking-console-ui"

type SpendShareItem = { key: string; label: string; pct: number; color: string }

type CategoryTrackingPressureSectionProps = {
  spendShare: SpendShareItem[]
  runwayPct: number
}

export function CategoryTrackingPressureSection({
  spendShare,
  runwayPct,
}: CategoryTrackingPressureSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div
        className="rounded-xl border p-5"
        style={{
          background: TOKENS.surfaceContainer,
          borderColor: TOKENS.outlineGhost,
          boxShadow: CARD_INSET,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.28em]"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Deployment pressure
            </p>
            <p className="mt-1 text-xs italic" style={{ color: TOKENS.onSurfaceMuted }}>
              Where outflows landed this month
            </p>
          </div>
          <TrendingDown className="h-5 w-5 shrink-0" style={{ color: ERROR_SOFT }} />
        </div>
        {spendShare.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {spendShare.slice(0, 4).map((s) => (
              <li key={s.key}>
                <div className="flex justify-between text-xs">
                  <span style={{ color: TOKENS.onSurface }}>{s.label}</span>
                  <span className="tabular-nums font-semibold" style={{ color: TOKENS.onSurface }}>
                    {s.pct.toFixed(0)}%
                  </span>
                </div>
                <CategoryTrackingBarProgress
                  percent={s.pct}
                  color={s.color}
                  label={`${s.label} ${s.pct.toFixed(0)} percent of deployment pressure`}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
            No spend yet.
          </p>
        )}
      </div>

      <div
        className="rounded-xl border p-5"
        style={{
          background: TOKENS.surfaceContainer,
          borderColor: TOKENS.outlineGhost,
          boxShadow: CARD_INSET,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.28em]"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Envelope integrity
            </p>
            <p className="mt-1 text-xs italic" style={{ color: TOKENS.onSurfaceMuted }}>
              Unspent vs total envelopes
            </p>
          </div>
          <Wallet className="h-5 w-5 shrink-0" style={{ color: TOKENS.secondary }} />
        </div>
        <p className="mt-3 text-2xl font-black tabular-nums" style={{ color: TOKENS.primary }}>
          {runwayPct.toFixed(0)}%
        </p>
        <CategoryTrackingSegmentedBlocks
          percent={runwayPct}
          activeColor={TOKENS.secondary}
          label={`Envelope integrity ${runwayPct.toFixed(0)} percent unspent`}
        />
        <div className="mt-4 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider">
          <span style={{ color: TOKENS.onSurfaceMuted }}>Target band</span>
          <span style={{ color: runwayPct >= 20 ? TOKENS.primary : ERROR_SOFT }}>
            {runwayPct >= 20 ? "Healthy buffer" : "Tight"}
          </span>
        </div>
      </div>
    </div>
  )
}
