import { TOKENS } from "@/lib/wealth-console-tokens"

export function SavingGoalDetailBentoLoading() {
  const shimmer = TOKENS.surfaceHigh
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading saving goal">
      <section className="px-1 py-2 sm:px-2">
        <div className="h-8 w-56 max-w-full rounded" style={{ background: shimmer }} />
        <div className="mt-6 h-3 w-28 rounded" style={{ background: shimmer }} />
        <div className="mt-3 h-12 w-44 max-w-full rounded" style={{ background: shimmer }} />
      </section>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-20 rounded-xl border"
            style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost }}
          />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-9 rounded-lg" style={{ background: shimmer }} />
        ))}
      </div>
    </div>
  )
}
