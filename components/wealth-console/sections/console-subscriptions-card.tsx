"use client"

import Link from "next/link"
import { ArrowUpRight, CalendarClock } from "lucide-react"
import { BENTO } from "@/lib/app-routes"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import {
  consoleFocus,
  consoleMicroLabel,
} from "@/components/wealth-console/console-ui"
import { cn } from "@/lib/utils"
import type { SubscriptionDashboardSnapshot } from "@/components/wealth-console/types"

const UPCOMING_LIMIT = 4
const URGENT_DAYS = 3

/** Matches the burn-rate tile's lifted look in the metrics band. */
export const CONSOLE_TILE_FLOAT_SHADOW =
  "inset 0 1px 0 0 rgba(218,226,253,0.08), 0 18px 40px rgba(0,0,0,0.22)"

export type ConsoleCardTone = "raised" | "recessed"

/** Whole-day distance from today (local calendar days; 0 = today). */
function daysUntil(iso: string) {
  const target = new Date(iso)
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const startOfTarget = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  )
  return Math.round(
    (startOfTarget.getTime() - startOfToday.getTime()) / 86_400_000,
  )
}

function dueLabel(days: number) {
  if (days <= 0) return "Today"
  if (days === 1) return "Tomorrow"
  return `In ${days}d`
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function SubscriptionRowSkeleton({ chipBg }: { chipBg: string }) {
  return (
    <li
      className="animate-pulse rounded-xl border px-3.5 py-3"
      style={{
        background: chipBg,
        borderColor: TOKENS.outlineGhost,
        boxShadow: CARD_INSET,
      }}
      aria-hidden
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="h-4 w-2/5 rounded" style={{ background: TOKENS.surfaceHigh }} />
          <div className="mt-2.5 flex items-center gap-1.5">
            <div className="h-4 w-14 rounded-full" style={{ background: TOKENS.surfaceHigh }} />
            <div className="h-3 w-16 rounded" style={{ background: TOKENS.surfaceHigh }} />
          </div>
        </div>
        <div className="h-5 w-16 shrink-0 rounded" style={{ background: TOKENS.surfaceHigh }} />
      </div>
    </li>
  )
}

export function ConsoleSubscriptionsCard({
  subscriptionDash,
  className,
  tone = "raised",
  floating = false,
}: {
  /** null while the secondary payload is still loading. */
  subscriptionDash: SubscriptionDashboardSnapshot | null
  className?: string
  tone?: ConsoleCardTone
  floating?: boolean
}) {
  const pending = subscriptionDash === null
  const upcoming = subscriptionDash?.upcoming ?? []
  const recessed = tone === "recessed"
  const cardBg = recessed ? TOKENS.surfaceLow : TOKENS.surfaceContainer
  const chipBg = recessed ? TOKENS.surfaceContainer : TOKENS.surfaceLow

  return (
    <div
      id="console-subscriptions"
      className={cn("scroll-mt-28 flex min-w-0 flex-col", className)}
    >
      <div
        className={cn(
          "flex h-full flex-col rounded-xl p-5 transition-colors hover:opacity-[0.98] sm:p-6",
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
                color: TOKENS.secondary,
              }}
            >
              <CalendarClock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                style={consoleMicroLabel}
              >
                Subscriptions
              </p>
              <p
                className="mt-1 max-w-xl text-xs leading-relaxed"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Active plans, bills, and upcoming charges.
              </p>
            </div>
          </div>
          <Link
            href={BENTO.subscriptions}
            className={cn(
              consoleFocus,
              "inline-flex min-h-11 shrink-0 items-center rounded-md p-1 transition-colors hover:bg-white/5",
            )}
            aria-label="Open subscriptions"
          >
            <ArrowUpRight className="h-4 w-4" style={{ color: TOKENS.onSurfaceMuted }} />
          </Link>
        </div>

        <div className="mt-5">
          {pending ? (
            <div
              className="h-8 w-28 animate-pulse rounded"
              style={{ background: TOKENS.surfaceHigh }}
              aria-hidden
            />
          ) : (
            <div className="text-3xl font-bold tabular-nums tracking-tight sm:text-[1.75rem]">
              <MajorFigureCurrency
                amount={subscriptionDash.monthlyActiveTotal}
                variant="neutral"
              />
            </div>
          )}
          <p
            className="mt-1.5 text-[10px] font-medium uppercase tracking-wider"
            style={consoleMicroLabel}
          >
            Monthly equivalent (active)
          </p>
        </div>

        <div className="mt-5 flex flex-1 flex-col border-t pt-5" style={{ borderColor: TOKENS.outlineGhost }}>
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: TOKENS.onSurfaceMutedElevated }}
          >
            Due in the next 14 days
          </p>
          <ul className="mt-3 flex flex-1 flex-col gap-2">
            {pending ? (
              Array.from({ length: 2 }).map((_, i) => <SubscriptionRowSkeleton key={i} chipBg={chipBg} />)
            ) : upcoming.length === 0 ? (
              <li
                className="flex flex-1 items-center rounded-xl border border-dashed px-4 py-8 text-center text-sm leading-snug"
                style={{
                  borderColor: TOKENS.outlineGhost,
                  color: TOKENS.onSurfaceMuted,
                }}
              >
                None scheduled — you&apos;re clear for this window.
              </li>
            ) : (
              upcoming.slice(0, UPCOMING_LIMIT).map((u) => {
                const days = daysUntil(u.date)
                const urgent = days <= URGENT_DAYS
                const isTrial = u.kind === "trial"

                return (
                  <li key={`${u.subscriptionId}-${u.kind}-${u.date}`}>
                    <Link
                      href={BENTO.subscriptions}
                      className={cn(
                        consoleFocus,
                        "group block rounded-xl border px-3.5 py-3 transition-colors hover:bg-white/4",
                      )}
                      style={{
                        background: chipBg,
                        borderColor: urgent
                          ? `color-mix(in srgb, ${TOKENS.warning} 35%, ${TOKENS.outlineGhost})`
                          : TOKENS.outlineGhost,
                        boxShadow: CARD_INSET,
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            className="truncate text-sm font-medium leading-snug transition-colors group-hover:text-white"
                            style={{ color: TOKENS.onSurface }}
                          >
                            {u.label}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span
                              className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                              style={
                                isTrial
                                  ? {
                                      background: `color-mix(in srgb, ${TOKENS.warning} 16%, ${TOKENS.surfaceHigh})`,
                                      color: TOKENS.warning,
                                      border: `1px solid ${TOKENS.outlineGhost}`,
                                    }
                                  : {
                                      background: TOKENS.surfaceHigh,
                                      color: TOKENS.onSurfaceMuted,
                                      border: `1px solid ${TOKENS.outlineGhost}`,
                                    }
                              }
                            >
                              {isTrial ? "Trial ends" : u.kind === "bill" ? "Bill" : "Renewal"}
                            </span>
                            <span
                              className={cn(
                                "text-[10px] tabular-nums",
                                urgent && "font-bold",
                              )}
                              style={{
                                color: urgent ? TOKENS.warning : TOKENS.onSurfaceMuted,
                              }}
                            >
                              {dueLabel(days)} · {formatDateShort(u.date)}
                            </span>
                          </div>
                        </div>
                        <MajorFigureCurrency
                          amount={u.amount}
                          variant="neutral"
                          className="shrink-0 text-sm font-bold! sm:text-base!"
                          decimalEm={0.45}
                        />
                      </div>
                    </Link>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
