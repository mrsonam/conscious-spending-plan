import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { SkeletonBlock } from "@/components/wealth-console/console-skeleton"

function StatCardSkeleton() {
  return (
    <div
      className="rounded-2xl border p-4 sm:p-5"
      style={{
        borderColor: TOKENS.outlineGhost,
        background: TOKENS.surfaceContainer,
        boxShadow: CARD_INSET,
      }}
    >
      <div className="flex items-center gap-2">
        <SkeletonBlock className="h-4 w-4 rounded-md" />
        <SkeletonBlock className="h-2.5 w-20" />
      </div>
      <SkeletonBlock className="mt-3 h-8 w-16" />
    </div>
  )
}

function GoalCardSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{
        borderColor: TOKENS.outlineGhost,
        background: TOKENS.surfaceContainer,
        boxShadow: CARD_INSET,
      }}
    >
      <SkeletonBlock className="h-1 w-full rounded-none" />
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <SkeletonBlock className="h-5 w-32" />
              <SkeletonBlock className="h-5 w-14 rounded-lg" />
            </div>
            <SkeletonBlock className="h-3 w-40" />
          </div>
          <SkeletonBlock className="h-10 w-10 shrink-0 rounded-xl" />
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <SkeletonBlock className="h-7 w-24" />
          <SkeletonBlock className="h-3 w-20" />
        </div>
        <SkeletonBlock className="h-2 w-full rounded-full" />
        <div className="flex flex-wrap gap-2">
          <SkeletonBlock className="h-7 w-14 rounded-lg" />
          <SkeletonBlock className="h-7 w-16 rounded-lg" />
          <SkeletonBlock className="h-7 w-14 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

export function SavingGoalsSkeleton() {
  return (
    <div className="w-full min-w-0 space-y-8 sm:space-y-10" aria-busy="true" aria-label="Loading saving goals">
      {/* Hero */}
      <section
        className="relative w-full overflow-hidden rounded-2xl border px-5 py-7 sm:px-8 sm:py-9"
        style={{
          borderColor: TOKENS.outlineGhost,
          background: TOKENS.surfaceContainer,
          boxShadow: CARD_INSET,
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex items-center gap-2">
              <SkeletonBlock className="h-2 w-2 rounded-full" />
              <SkeletonBlock className="h-2.5 w-24" />
            </div>
            <SkeletonBlock className="h-8 w-full max-w-sm sm:h-9" />
            <SkeletonBlock className="h-4 w-full max-w-lg" />
            <SkeletonBlock className="h-4 w-3/4 max-w-md" />
            <SkeletonBlock className="h-4 w-28" />
          </div>
          <SkeletonBlock className="h-11 w-32 shrink-0 rounded-xl" />
        </div>
      </section>

      {/* Summary stats */}
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Goal cards */}
      <div className="space-y-4">
        <SkeletonBlock className="h-3 w-16" />
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <GoalCardSkeleton />
          <GoalCardSkeleton />
        </div>
      </div>
    </div>
  )
}
