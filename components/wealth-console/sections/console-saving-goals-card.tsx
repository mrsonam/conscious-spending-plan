"use client"

import Link from "next/link"
import { ArrowUpRight, Target } from "lucide-react"
import { BENTO } from "@/lib/app-routes"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import {
  consoleFocus,
  consoleMicroLabel,
} from "@/components/wealth-console/console-ui"
import { cn } from "@/lib/utils"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import {
  CONSOLE_TILE_FLOAT_SHADOW,
  type ConsoleCardTone,
} from "@/components/wealth-console/sections/console-subscriptions-card"
import type { DashboardSavingGoal } from "@/components/wealth-console/types"

const GOALS_LIMIT = 4

/** "Mar 2027", month precision; finer would be false accuracy. */
function formatCompleteBy(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  })
}

function GoalRowSkeleton() {
  return (
    <li className="animate-pulse" aria-hidden>
      <div className="flex items-center justify-between gap-3">
        <div className="h-4 w-2/5 rounded" style={{ background: TOKENS.surfaceHigh }} />
        <div className="h-4 w-10 rounded" style={{ background: TOKENS.surfaceHigh }} />
      </div>
      <div className="mt-2 h-2 w-full rounded-full" style={{ background: TOKENS.surfaceHigh }} />
      <div className="mt-2 h-3 w-24 rounded" style={{ background: TOKENS.surfaceHigh }} />
    </li>
  )
}

export function ConsoleSavingGoalsCard({
  goals,
  className,
  tone = "raised",
  floating = false,
}: {
  /** null while the secondary payload is still loading. */
  goals: DashboardSavingGoal[] | null
  className?: string
  tone?: ConsoleCardTone
  floating?: boolean
}) {
  const { formatCurrency } = useFormatCurrency()
  const pending = goals === null
  const shown = (goals ?? []).slice(0, GOALS_LIMIT)
  const recessed = tone === "recessed"
  const cardBg = recessed ? TOKENS.surfaceLow : TOKENS.surfaceContainer
  const chipBg = recessed ? TOKENS.surfaceContainer : TOKENS.surfaceLow


  return (
    <div
      id="console-saving-goals"
      className={cn("scroll-mt-28 flex min-w-0 flex-col", className)}
    >
      <div
        className={cn(
          "flex h-full flex-col rounded-xl p-5 sm:p-6",
          floating && "lg:-translate-y-2",
        )}
        style={{
          background: cardBg,
          boxShadow: floating ? CONSOLE_TILE_FLOAT_SHADOW : CARD_INSET,
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{
                background: chipBg,
                color: TOKENS.primary,
              }}
            >
              <Target className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                style={consoleMicroLabel}
              >
                Saving goals
              </p>
              <p
                className="mt-1 max-w-xl text-xs leading-relaxed"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Progress toward your targets.
              </p>
            </div>
          </div>
          <Link
            href={BENTO.savingGoals}
            className={cn(
              consoleFocus,
              "inline-flex min-h-11 shrink-0 items-center rounded-md p-1 transition-[background-color,transform] duration-150 hover:bg-white/5 active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100",
            )}
            aria-label="Open saving goals"
          >
            <ArrowUpRight className="h-4 w-4" style={{ color: TOKENS.onSurfaceMuted }} />
          </Link>
        </div>

        <ul className="mt-5 space-y-4">
          {pending ? (
            Array.from({ length: 2 }).map((_, i) => <GoalRowSkeleton key={i} />)
          ) : shown.length === 0 ? (
            <li
              className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center"
              style={{ borderColor: TOKENS.outlineGhost }}
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{ background: chipBg, color: TOKENS.onSurfaceMuted }}
              >
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: TOKENS.onSurface }}>
                  No goals yet
                </p>
                <p
                  className="mt-1 text-xs leading-relaxed"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Create one to give your savings a job.
                </p>
              </div>
            </li>
          ) : (
            shown.map((goal) => {
              // goal.percent is the savings *allocation* share, not progress.
              // completion is how much of the target has actually been saved.
              const completionPct =
                goal.target != null && goal.target > 0
                  ? Math.min(100, Math.max(0, (goal.current / goal.target) * 100))
                  : 0
              const complete = goal.status === "complete" || completionPct >= 100
              const barColor = complete ? TOKENS.primary : TOKENS.secondary

              return (
                <li key={goal.id}>
                  <Link
                    href={`${BENTO.savingGoals}/${goal.id}`}
                    className={cn(
                      consoleFocus,
                      "group block rounded-xl border border-transparent px-3 py-2.5 -mx-1",
                      "transition-[background-color,border-color,transform] duration-200 ease-out",
                      "hover:border-white/10 hover:bg-white/4 hover:-translate-y-px",
                      "active:translate-y-0 active:scale-[0.995]",
                      "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
                    )}
                  >
                  <div className="flex items-baseline justify-between gap-3">
                    <p
                      className="min-w-0 truncate text-sm font-medium transition-colors duration-200 group-hover:text-white"
                      style={{ color: TOKENS.onSurface }}
                    >
                      {goal.name}
                    </p>
                    {goal.target != null ? (
                      <span
                        className="shrink-0 text-xs font-bold tabular-nums"
                        style={{ color: complete ? TOKENS.primary : TOKENS.onSurfaceMuted }}
                      >
                        {complete ? "Done" : `${completionPct.toFixed(0)}% saved`}
                      </span>
                    ) : (
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                        style={{
                          background: `color-mix(in srgb, ${TOKENS.secondary} 14%, ${TOKENS.surfaceHigh})`,
                          color: TOKENS.secondary,
                          border: `1px solid ${TOKENS.outlineGhost}`,
                        }}
                      >
                        Ongoing
                      </span>
                    )}
                  </div>
                  {goal.target != null ? (
                    <>
                      <div
                        className="mt-2 h-2 overflow-hidden rounded-full"
                        style={{ background: chipBg }}
                        role="progressbar"
                        aria-valuenow={Math.round(completionPct)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${goal.name} progress`}
                      >
                        <div
                          className="h-full origin-left rounded-full transition-transform duration-500 ease-out motion-reduce:transition-none"
                          style={{
                            // scaleX (not width) so the entry animation stays off the layout thread
                            transform: `scaleX(${completionPct / 100})`,
                            background: barColor,
                          }}
                        />
                      </div>
                      <p
                        className="mt-1.5 text-[10px] tabular-nums"
                        style={{ color: TOKENS.onSurfaceMuted }}
                      >
                        {formatCurrency(goal.current)}{" "}
                        <span style={{ color: TOKENS.onSurfaceMutedElevated }}>
                          of {formatCurrency(goal.target)}
                        </span>
                        {!complete && goal.completeBy ? (
                          <span>
                            {" "}
                            · on pace for{" "}
                            <span style={{ color: TOKENS.secondary }}>
                              {formatCompleteBy(goal.completeBy)}
                            </span>
                          </span>
                        ) : null}
                      </p>
                    </>
                  ) : (
                    <p
                      className="mt-1.5 text-[10px] tabular-nums"
                      style={{ color: TOKENS.onSurfaceMuted }}
                    >
                      <span className="text-xs font-bold" style={{ color: TOKENS.onSurface }}>
                        {formatCurrency(goal.current)}
                      </span>{" "}
                      saved
                      {goal.percent > 0 ? (
                        <span> · grows with {goal.percent.toFixed(0)}% of savings</span>
                      ) : null}
                    </p>
                  )}
                  </Link>
                </li>
              )
            })
          )}
        </ul>
      </div>
    </div>
  )
}
