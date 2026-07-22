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
  savingsDisplayBreakdown,
  type CategoryTrackingRow,
  type TrackingFundCategoryMeta,
} from "@/lib/category-tracking-shared"
import { BENTO } from "@/lib/app-routes"
import {
  computeCategoryPace,
  CATEGORY_PACE_META,
  CategoryTrackingPaceBar,
  CategoryTrackingSparkline,
} from "@/components/category-tracking/category-tracking-console-ui"
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
  savingsAssignedToGoals: number
  savingsTotal: number | null
  movedIn: number
  movedOut: number
  elapsed: number
  usagePercent: number
  historySeries: number[]
  formatCurrency: (amount: number) => string
}

function PillarMatrixCard({
  cat,
  span,
  isOverspent,
  displayAmount,
  data,
  deployed,
  savingsAssignedToGoals,
  savingsTotal,
  movedIn,
  movedOut,
  elapsed,
  usagePercent,
  historySeries,
  formatCurrency,
}: PillarMatrixCardProps) {
  const Icon = cat.Icon
  const pace = computeCategoryPace(usagePercent, elapsed)
  const paceColor = isOverspent ? ERROR_SOFT : CATEGORY_PACE_META[pace.state].color
  const PaceIcon = CATEGORY_PACE_META[pace.state].Icon

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
              {formatCurrency(savingsTotal ?? displayAmount + savingsAssignedToGoals)}
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
      <div className="mt-3">
        <CategoryTrackingPaceBar
          usagePercent={usagePercent}
          elapsed={elapsed}
          color={paceColor}
          label={`${cat.label} pace: ${pace.label}, ${usagePercent.toFixed(0)} percent of envelope used against ${(elapsed * 100).toFixed(0)} percent of the month elapsed`}
        />
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="text-[10px] tabular-nums" style={{ color: TOKENS.onSurfaceMuted }}>
            {usagePercent.toFixed(0)}% used
            {elapsed > 0 && elapsed < 1 && ` · ${(elapsed * 100).toFixed(0)}% month`}
          </span>
          <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: paceColor }}
          >
            <PaceIcon className="h-3 w-3 shrink-0" aria-hidden />
            {pace.label}
          </span>
        </div>
      </div>
      {historySeries.length > 0 && (
        <div
          className="mt-3 flex items-center justify-between gap-2 border-t pt-3"
          style={{ borderColor: TOKENS.outlineGhost }}
        >
          <span
            className="text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: TOKENS.onSurfaceMuted }}
          >
            6-mo trend
          </span>
          <CategoryTrackingSparkline
            values={historySeries}
            color={cat.colorHex}
            currentIndex={historySeries.length - 1}
          />
        </div>
      )}
    </Link>
  )
}

type CategoryTrackingPillarSectionProps = {
  tracking: Record<string, CategoryTrackingRow>
  bucketTransferFlow: Record<string, BucketTransferFlow>
  savingsGeneralAvailable: number
  savingsAssignedToGoals: number
  elapsed: number
  history: Record<string, Array<{ month: string; spent: number }>> | null
  formatCurrency: (amount: number) => string
}

export function CategoryTrackingPillarSection({
  tracking,
  bucketTransferFlow,
  savingsGeneralAvailable,
  savingsAssignedToGoals,
  elapsed,
  history,
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
          const savingsBreakdown =
            cat.key === "savings"
              ? savingsDisplayBreakdown(
                  data,
                  savingsAssignedToGoals,
                  savingsGeneralAvailable,
                )
              : null
          const displayAmount =
            cat.key === "savings"
              ? (savingsBreakdown?.spendable ?? 0)
              : (data.displayRemaining ?? envelopeHeadroom)
          const usageBase =
            cat.key === "investment"
              ? data.available > 0
                ? data.available
                : data.allocated + data.carryover
              : data.allocated
          const usagePercent = usageBase > 0 ? (deployed / usageBase) * 100 : 0
          const historySeries = (history?.[cat.key] ?? []).slice(-6).map((h) => h.spent)
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
              savingsAssignedToGoals={savingsAssignedToGoals}
              savingsTotal={savingsBreakdown?.total ?? null}
              movedIn={movedIn}
              movedOut={movedOut}
              elapsed={elapsed}
              usagePercent={usagePercent}
              historySeries={historySeries}
              formatCurrency={formatCurrency}
            />
          )
        })}
      </div>
    </div>
  )
}
