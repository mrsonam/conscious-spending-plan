"use client"

import type { ReactNode } from "react"
import { Activity, LayoutGrid, Search } from "lucide-react"
import {
  ScrambleCurrencyValue,
  ScramblePercentValue,
} from "@/components/ui/scramble-number"
import { cn } from "@/lib/utils"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import {
  SHELL_HEADER_INNER_CLASS,
  SHELL_HEADER_STICKY_BAND_CLASS,
  shellHeaderBorderStyle,
} from "@/components/layout/shell-header-zone"
import {
  consoleHeroFigureClass,
  consoleHeroFigureInnerClass,
} from "@/components/wealth-console/console-ui"

type DashboardRouteLoadingProps = {
  /** False when the page already renders `<Header />` (session hydrate). */
  showHeader?: boolean
}

function RouteHeaderSkeleton() {
  return (
    <header
      className={`sticky top-0 z-30 px-4 sm:px-6 lg:pl-6 ${SHELL_HEADER_STICKY_BAND_CLASS}`}
      style={{
        background: `color-mix(in srgb, ${TOKENS.surface} 96%, transparent)`,
        ...shellHeaderBorderStyle,
      }}
    >
      <div className={`${SHELL_HEADER_INNER_CLASS} pl-12 sm:pl-14 lg:pl-0`}>
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:items-start lg:min-h-11">
          <div
            className="h-6 w-36 max-w-[55%] animate-pulse rounded-md sm:h-5 sm:w-44"
            style={{ background: TOKENS.surfaceHigh }}
          />
        </div>
        <div
          className="flex shrink-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 sm:px-3 lg:h-9 lg:py-0"
          style={{
            borderColor: TOKENS.outlineGhost,
            background: `color-mix(in srgb, ${TOKENS.surfaceHigh} 70%, transparent)`,
          }}
          aria-hidden
        >
          <Search className="h-3.5 w-3.5" style={{ color: TOKENS.onSurfaceMuted }} />
          <span
            className="hidden h-2.5 w-14 animate-pulse rounded sm:block"
            style={{ background: TOKENS.surfaceHigh }}
          />
        </div>
      </div>
    </header>
  )
}

function SegmentedBar({
  percent,
  color,
  label,
}: {
  percent: number
  color: string
  label: string
}) {
  const blocks = 14
  const filled = Math.max(0, Math.min(blocks, Math.round((percent / 100) * blocks)))

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      className="mt-3 flex gap-1"
    >
      {Array.from({ length: blocks }).map((_, i) => (
        <span
          key={i}
          className="h-2.5 flex-1 rounded-[4px]"
          style={{
            background:
              i < filled
                ? color
                : `color-mix(in srgb, ${TOKENS.onSurfaceMuted} 22%, ${TOKENS.surfaceLow})`,
            opacity: i < filled ? 1 : 0.55,
            boxShadow: i < filled ? CARD_INSET : undefined,
          }}
        />
      ))}
    </div>
  )
}

function ConsoleCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn("rounded-xl border p-5 sm:p-6", className)}
      style={{
        background: TOKENS.surfaceContainer,
        borderColor: TOKENS.outlineGhost,
        boxShadow: CARD_INSET,
      }}
    >
      {children}
    </div>
  )
}

/** Wealth Console route transition shell, matches page bento loading patterns. */
export function DashboardRouteLoading({ showHeader = true }: DashboardRouteLoadingProps) {
  return (
    <>
      {showHeader ? <RouteHeaderSkeleton /> : null}
      <div
        className="mx-auto max-w-7xl space-y-6 px-4 pb-10 pt-4 sm:space-y-8 sm:px-6 lg:px-8"
        aria-busy="true"
        aria-label="Loading page"
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5 lg:items-start">
          <section className="lg:col-span-7">
            <div className="px-1 py-2 sm:px-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: TOKENS.primary, boxShadow: CARD_INSET }}
                  />
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.28em]"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    Wealth console
                  </p>
                </div>
                <div
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
                  style={{
                    background: `color-mix(in srgb, ${TOKENS.onSurfaceMuted} 18%, ${TOKENS.surfaceLow})`,
                    border: `1px solid ${TOKENS.outlineGhost}`,
                    color: TOKENS.onSurfaceMuted,
                    boxShadow: CARD_INSET,
                  }}
                >
                  <Activity className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                  <span className="normal-case opacity-80">Syncing data</span>
                </div>
              </div>

              <p
                className="mt-3 text-[10px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Period snapshot
              </p>
              <div className={cn("mt-2", consoleHeroFigureClass)}>
                <ScrambleCurrencyValue
                  variant="prosperity"
                  min={2400}
                  max={42000}
                  className={consoleHeroFigureInnerClass}
                />
              </div>
              <p
                className="mt-2 max-w-xl text-sm leading-relaxed"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Pulling your latest balances, envelopes, and activity into view.
              </p>

              <div className="mt-6">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p
                      className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                      style={{ color: TOKENS.onSurfaceMuted }}
                    >
                      Load progress
                    </p>
                    <p className="mt-1 text-xs italic" style={{ color: TOKENS.onSurfaceMuted }}>
                      Hydrating cached state, then refreshing from API
                    </p>
                  </div>
                  <div className="text-lg font-bold tabular-nums" style={{ color: TOKENS.onSurface }}>
                    <ScramblePercentValue
                      className="inline text-lg font-bold"
                      min={38}
                      max={86}
                      suffixClassName="text-lg font-bold"
                    />
                  </div>
                </div>
                <SegmentedBar percent={62} color={TOKENS.primary} label="Page load progress" />
              </div>

              <div
                className="mt-8 grid grid-cols-1 gap-6 border-t pt-6 sm:grid-cols-3"
                style={{ borderColor: TOKENS.outlineGhost }}
              >
                {[
                  { label: "Inflows", variant: "income" as const },
                  { label: "Outflows", variant: "loss" as const },
                  { label: "Net position", variant: "neutral" as const },
                ].map((kpi) => (
                  <div key={kpi.label}>
                    <p
                      className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                      style={{ color: TOKENS.onSurfaceMuted }}
                    >
                      {kpi.label}
                    </p>
                    <div className="mt-2">
                      <ScrambleCurrencyValue
                        variant={kpi.variant}
                        min={600}
                        max={18000}
                        className="text-lg font-bold!"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="lg:col-span-5">
            <ConsoleCard className="lg:sticky lg:top-4">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.28em]"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Command surface
              </p>
              <p className="mt-3 text-sm leading-snug" style={{ color: TOKENS.onSurfaceMuted }}>
                Filters, period controls, and quick actions appear here once the page is ready.
              </p>
              <div className="mt-6 space-y-3">
                {["Period", "Account", "View"].map((row) => (
                  <div key={row}>
                    <p
                      className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                      style={{ color: TOKENS.onSurfaceMuted }}
                    >
                      {row}
                    </p>
                    <div
                      className="mt-2 h-10 animate-pulse rounded-xl border"
                      style={{
                        background: TOKENS.surfaceLow,
                        borderColor: TOKENS.outlineGhost,
                      }}
                    />
                  </div>
                ))}
              </div>
            </ConsoleCard>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
          <ConsoleCard className="lg:col-span-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
                  Activity ledger
                </h3>
                <p className="mt-1 text-xs italic" style={{ color: TOKENS.onSurfaceMuted }}>
                  Recent entries and rollups
                </p>
              </div>
              <LayoutGrid className="h-5 w-5 shrink-0" style={{ color: TOKENS.secondary }} />
            </div>
            <ul className="mt-5 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <li
                  key={i}
                  className="flex flex-col gap-3 rounded-xl border px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  style={{
                    background: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    boxShadow: CARD_INSET,
                  }}
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div
                      className="h-4 animate-pulse rounded-md"
                      style={{
                        background: TOKENS.surfaceHigh,
                        width: `${48 + (i % 3) * 12}%`,
                      }}
                    />
                    <div className="flex flex-wrap gap-2">
                      <div
                        className="h-5 w-16 animate-pulse rounded-full"
                        style={{ background: TOKENS.surfaceHigh }}
                      />
                      <div
                        className="h-5 w-20 animate-pulse rounded-full"
                        style={{ background: TOKENS.surfaceHigh }}
                      />
                    </div>
                  </div>
                  <ScrambleCurrencyValue
                    min={24}
                    max={4200}
                    className="text-sm font-bold! sm:text-base!"
                  />
                </li>
              ))}
            </ul>
          </ConsoleCard>

          <ConsoleCard className="h-fit lg:col-span-4">
            <p className="text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
              Fund mix
            </p>
            <p className="mt-1 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
              Envelope allocation preview
            </p>
            <div
              className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full"
              style={{ background: TOKENS.surfaceHigh }}
              aria-hidden
            >
              {[TOKENS.primary, TOKENS.secondary, TOKENS.tertiary, "#7c9cff"].map((color, i) => (
                <div
                  key={i}
                  className="min-w-[2px] shrink-0"
                  style={{ width: "25%", background: color }}
                />
              ))}
            </div>
            <div className="mt-5 space-y-3">
              {["Fixed costs", "Savings", "Investment", "Guilt-free"].map((label, i) => (
                <div key={label}>
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span style={{ color: TOKENS.onSurface }}>{label}</span>
                    <span className="tabular-nums font-semibold" style={{ color: TOKENS.onSurface }}>
                      <ScramblePercentValue
                        className="inline text-[11px] font-semibold"
                        min={12 + i * 5}
                        max={38 + i * 8}
                        suffixClassName="text-[11px] font-semibold"
                      />
                    </span>
                  </div>
                  <div
                    className="mt-1.5 h-2 w-full overflow-hidden rounded-full"
                    style={{ background: TOKENS.surfaceHigh }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${32 + i * 12}%`,
                        background:
                          i === 0
                            ? TOKENS.primary
                            : i === 1
                              ? TOKENS.secondary
                              : i === 2
                                ? TOKENS.tertiary
                                : "#7c9cff",
                        boxShadow: CARD_INSET,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </ConsoleCard>
        </div>
      </div>
    </>
  )
}
