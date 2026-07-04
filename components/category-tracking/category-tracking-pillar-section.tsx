"use client"

import type { CSSProperties } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "@/lib/income-page-types"
import {
  TRACKING_FUND_CATEGORIES,
  netPillarHeadroom,
  type CategoryTrackingRow,
  type TrackingFundCategoryMeta,
} from "@/lib/category-tracking-shared"
import { BENTO } from "@/lib/app-routes"
import { CategoryTrackingSegmentedBlocks } from "@/components/category-tracking/category-tracking-console-ui"
import type { BucketTransferFlow } from "@/lib/category-bucket-transfer-api"

function PillarCardIcon({
  Icon,
  pillarColor,
}: {
  Icon: LucideIcon
  pillarColor: string
}) {
  // Hover styling is pure CSS (group-hover + CSS vars) so the whole card
  // doesn't re-render on every mouse enter/leave.
  return (
    <span
      className="inline-flex shrink-0 text-[var(--pillar-idle)] transition-[color,transform] duration-400 ease-out group-hover:scale-115 group-hover:text-[var(--pillar-accent)] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      style={
        {
          "--pillar-idle": TOKENS.tertiary,
          "--pillar-accent": pillarColor,
        } as CSSProperties
      }
    >
      <Icon className="h-4 w-4" />
    </span>
  )
}

type PillarMatrixCardProps = {
  cat: TrackingFundCategoryMeta
  span: string
  isOverspent: boolean
  displayAmount: number
  data: CategoryTrackingRow
  deployed: number
  savingsBucketTotal: number
  savingsAssignedToGoals: number
  movedIn: number
  movedOut: number
  paceLabel: string
  elapsed: number
  usagePercent: number
  formatCurrency: (amount: number) => string
}

function PillarMatrixCard({
  cat,
  span,
  isOverspent,
  displayAmount,
  data,
  deployed,
  savingsBucketTotal,
  savingsAssignedToGoals,
  movedIn,
  movedOut,
  paceLabel,
  elapsed,
  usagePercent,
  formatCurrency,
}: PillarMatrixCardProps) {
  const Icon = cat.Icon

  return (
    <Link
      href={BENTO.categoryDetail(cat.key)}
      className={cn(
        "group block rounded-xl border p-4 transition-colors hover:bg-white/4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4edea3]/45 sm:p-5",
        span,
      )}
      style={{
        background: TOKENS.surfaceLow,
        borderColor: isOverspent ? ERROR_SOFT : TOKENS.outlineGhost,
        boxShadow: CARD_INSET,
      }}
      aria-label={`Open ${cat.label} details`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
          {cat.label}
        </span>
        <PillarCardIcon Icon={Icon} pillarColor={cat.colorHex} />
      </div>
      <div className="mt-3">
        <MajorFigureCurrency
          amount={displayAmount}
          variant={isOverspent ? "loss" : "prosperity"}
          className="text-xl font-black sm:text-2xl!"
          decimalEm={0.4}
        />
        <p
          className="mt-1 text-[10px]"
          style={{ color: isOverspent ? ERROR_SOFT : TOKENS.onSurfaceMuted }}
        >
          {cat.key === "savings"
            ? "Spendable"
            : isOverspent
              ? `Breach ${formatCurrency(data.overspent)}`
              : "Residual"}
        </p>
      </div>
      <div className="mt-3 space-y-1 text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>
        <div className="flex justify-between">
          <span>Envelope</span>
          <span style={{ color: TOKENS.onSurface }}>{formatCurrency(data.allocated)}</span>
        </div>
        {cat.key === "savings" && (
          <div className="flex justify-between">
            <span>Total in savings</span>
            <span style={{ color: TOKENS.onSurface }}>
              {formatCurrency(savingsBucketTotal)}
            </span>
          </div>
        )}
        {cat.key === "savings" && savingsAssignedToGoals > 0 && (
          <div className="flex justify-between">
            <span>In saving goals</span>
            <span style={{ color: TOKENS.secondary }}>
              −{formatCurrency(savingsAssignedToGoals)}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span>{cat.key === "investment" ? "Transferred" : "Spent"}</span>
          <span style={{ color: ERROR_SOFT }}>{formatCurrency(deployed)}</span>
        </div>
        {(data.carryover > 0 || data.overspending > 0 || movedIn > 0 || movedOut > 0) && (
          <div className="border-t pt-2" style={{ borderColor: TOKENS.outlineGhost }}>
            {data.carryover > 0 && (
              <div className="flex justify-between" style={{ color: TOKENS.primary }}>
                <span>Carry</span>
                <span>+{formatCurrency(data.carryover)}</span>
              </div>
            )}
            {movedIn > 0 && (
              <div className="flex justify-between" style={{ color: TOKENS.secondary }}>
                <span>Moved in</span>
                <span>+{formatCurrency(movedIn)}</span>
              </div>
            )}
            {movedOut > 0 && (
              <div className="flex justify-between" style={{ color: TOKENS.onSurfaceMuted }}>
                <span>Moved out</span>
                <span>-{formatCurrency(movedOut)}</span>
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
    </Link>
  )
}

type CategoryTrackingPillarSectionProps = {
  tracking: Record<string, CategoryTrackingRow>
  bucketTransferFlow: Record<string, BucketTransferFlow>
  savingsGeneralAvailable: number
  savingsAssignedToGoals: number
  elapsed: number
  formatCurrency: (amount: number) => string
}

export function CategoryTrackingPillarSection({
  tracking,
  bucketTransferFlow,
  savingsGeneralAvailable,
  savingsAssignedToGoals,
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
          const flow = bucketTransferFlow[cat.key]
          const movedIn = flow?.in ?? 0
          const movedOut = flow?.out ?? 0
          const isOverspent = data.overspent > 0
          const deployed =
            cat.key === "investment" ? data.transferred : data.spent
          const envelopeHeadroom = netPillarHeadroom(data)
          const savingsBucketTotal = savingsGeneralAvailable + savingsAssignedToGoals
          const displayAmount =
            cat.key === "savings"
              ? Math.max(
                  0,
                  Math.round(
                    ((data.displayRemaining ?? savingsBucketTotal) -
                      Math.max(0, savingsAssignedToGoals)) *
                      100,
                  ) / 100,
                )
              : (data.displayRemaining ?? envelopeHeadroom)
          const usageBase =
            cat.key === "investment"
              ? data.available > 0
                ? data.available
                : data.allocated + data.carryover
              : data.allocated
          const usagePercent = usageBase > 0 ? (deployed / usageBase) * 100 : 0
          let paceLabel = "-"
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
            <PillarMatrixCard
              key={cat.key}
              cat={cat}
              span={span}
              isOverspent={isOverspent}
              displayAmount={displayAmount}
              data={data}
              deployed={deployed}
              savingsBucketTotal={savingsBucketTotal}
              savingsAssignedToGoals={savingsAssignedToGoals}
              movedIn={movedIn}
              movedOut={movedOut}
              paceLabel={paceLabel}
              elapsed={elapsed}
              usagePercent={usagePercent}
              formatCurrency={formatCurrency}
            />
          )
        })}
      </div>
    </div>
  )
}
