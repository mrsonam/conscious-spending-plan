"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { AppSelect } from "@/components/ui/app-select"
import { ScrambleCurrencyValue, ScramblePercentValue } from "@/components/ui/scramble-number"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "@/lib/income-page-types"
import { TRACKING_FUND_CATEGORIES, type TrackingFundKey } from "@/lib/category-tracking-shared"
import { BENTO } from "@/lib/app-routes"
import { TrendingDown, Wallet, Calendar, Activity, History } from "lucide-react"
import {
  CategoryTrackingSegmentedBlocks,
  categoryTrackingConsoleField,
  pillarSegmentColor,
  CATEGORY_TRACKING_PERIOD_ID,
} from "@/components/category-tracking/category-tracking-console-ui"
import {
  consoleHeroFigureClass,
  consoleHeroFigureInnerClass,
} from "@/components/wealth-console/console-ui"

export type CategoryTrackingBentoLoadingProps = {
  monthOptions: { value: string; label: string; month: number; year: number }[]
  selectedMonth: number
  selectedYear: number
  setSelectedMonth: (n: number) => void
  setSelectedYear: (n: number) => void
  selectedMonthLabel: string
}

/**
 * Wealth Console category-tracking loading shell: same layout and copy as the loaded page,
 * with per-block borders and scramble-number placeholders (dashboard / expenses parity).
 */
export function CategoryTrackingBentoLoading({
  monthOptions,
  selectedMonth,
  selectedYear,
  setSelectedMonth,
  setSelectedYear,
  selectedMonthLabel,
}: CategoryTrackingBentoLoadingProps) {
  return (
    <div className="space-y-6 sm:space-y-8" aria-busy="true" aria-label="Loading category tracking">
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
                  Live fund telemetry
                </p>
              </div>
              <div
                className="inline-flex flex-wrap items-center gap-x-1.5 rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
                style={{
                  background: `color-mix(in srgb, ${TOKENS.onSurfaceMuted} 18%, ${TOKENS.surfaceLow})`,
                  border: `1px solid ${TOKENS.outlineGhost}`,
                  color: TOKENS.onSurfaceMuted,
                  boxShadow: CARD_INSET,
                }}
              >
                <TrendingDown className="mr-1 h-4 w-4 shrink-0" strokeWidth={2} />
                <span className="opacity-80 normal-case">6-mo spend vs prior</span>
                <span className="tabular-nums normal-case" aria-hidden>
                  <ScramblePercentValue
                    className="text-[10px] font-bold"
                    min={-14}
                    max={22}
                    suffixClassName="text-[10px] font-bold"
                  />
                </span>
              </div>
            </div>

            <p
              className="mt-3 text-[10px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Deployable balance
            </p>
            <div className={cn("mt-2", consoleHeroFigureClass)}>
              <ScrambleCurrencyValue
                variant="prosperity"
                min={1200}
                max={28000}
                className={consoleHeroFigureInnerClass}
              />
            </div>
            <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: TOKENS.onSurfaceMuted }}>
              Headroom left inside your four pillars for{" "}
              <span style={{ color: TOKENS.onSurface }}>{selectedMonthLabel}</span>. Route spend on{" "}
              <Link
                href={BENTO.expenses}
                className="font-semibold underline-offset-2 hover:underline"
                style={{ color: TOKENS.primary }}
              >
                Expenses
              </Link>{" "}
              so each line inherits a fund tag.
            </p>

            <div className="mt-6">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    Budget drawdown
                  </p>
                  <p className="mt-1 text-xs italic" style={{ color: TOKENS.onSurfaceMuted }}>
                    Consumption vs envelopes (allocated)
                  </p>
                </div>
                <div className="text-lg font-bold tabular-nums" style={{ color: TOKENS.onSurface }}>
                  <ScramblePercentValue
                    className="inline text-lg font-bold"
                    min={22}
                    max={94}
                    suffixClassName="text-lg font-bold"
                  />
                </div>
              </div>
              <CategoryTrackingSegmentedBlocks
                percent={52}
                activeColor={TOKENS.primary}
                label="Budget drawdown loading"
              />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider">
                <span style={{ color: TOKENS.onSurfaceMuted }}>Residual runway</span>
                <span style={{ color: TOKENS.secondary }} className="tabular-nums">
                  <ScramblePercentValue
                    className="inline font-bold"
                    min={18}
                    max={72}
                    suffixClassName="text-xs font-semibold"
                  />{" "}
                  unspent
                </span>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 border-t pt-6 sm:grid-cols-3" style={{ borderColor: TOKENS.outlineGhost }}>
              <div>
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Income (month)
                </p>
                <div className="mt-2">
                  <ScrambleCurrencyValue variant="income" min={800} max={22000} className="text-lg font-bold!" />
                </div>
              </div>
              <div>
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Envelope load
                </p>
                <div className="mt-2">
                  <ScrambleCurrencyValue variant="neutral" min={700} max={20000} className="text-lg font-bold!" />
                </div>
              </div>
              <div>
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Deployed
                </p>
                <div className="mt-2">
                  <ScrambleCurrencyValue variant="loss" min={400} max={18000} className="text-lg font-bold!" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="lg:col-span-5">
          <div
            className="rounded-xl border p-5 sm:p-6 lg:sticky lg:top-4"
            style={{
              background: TOKENS.surfaceContainer,
              borderColor: TOKENS.outlineGhost,
              boxShadow: CARD_INSET,
            }}
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.28em]"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Command surface
            </p>
            <p className="mt-3 text-sm leading-snug" style={{ color: TOKENS.onSurfaceMuted }}>
              Select the statement month, then route spend or adjust envelopes. Fund weights live in settings.
            </p>

            <div
              className="mt-6 flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0" style={{ color: TOKENS.onSurfaceMuted }} />
                <span>Period</span>
              </div>
            </div>
            <div className="mt-2">
              <AppSelect
                value={`${selectedYear}-${selectedMonth}`}
                onValueChange={(v) => {
                  const [y, m] = v.split("-").map(Number)
                  setSelectedYear(y)
                  setSelectedMonth(m)
                }}
               
                className={cn(categoryTrackingConsoleField, "mt-1 border-transparent")}
                style={{
                  backgroundColor: TOKENS.surfaceLow,
                  borderColor: TOKENS.outlineGhost,
                  color: TOKENS.onSurface,
                }}
                options={monthOptions.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
              />
            </div>
          </div>
        </section>
      </div>

      <div className="w-full min-w-0 space-y-6 sm:space-y-8">
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-5">
          <div
            className="rounded-xl border p-5 sm:p-6 lg:p-7 lg:col-span-8"
            style={{
              background: TOKENS.surfaceContainer,
              borderColor: TOKENS.outlineGhost,
              boxShadow: CARD_INSET,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
                  Allocation schema
                </h3>
                <p className="mt-1 text-xs italic" style={{ color: TOKENS.onSurfaceMuted }}>
                  {selectedMonthLabel} split of recognized income
                </p>
              </div>
              <Activity className="h-5 w-5 shrink-0" style={{ color: TOKENS.secondary }} />
            </div>

            <div
              className="mt-5 flex h-2.5 w-full min-w-0 overflow-hidden rounded-full"
              style={{ background: TOKENS.surfaceHigh }}
              aria-hidden
            >
              {TRACKING_FUND_CATEGORIES.map((cat) => (
                <div
                  key={cat.key}
                  className="min-w-[2px] shrink-0"
                  style={{ width: "25%", background: pillarSegmentColor(cat.key) }}
                />
              ))}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {TRACKING_FUND_CATEGORIES.map((cat) => {
                const pillarColor = pillarSegmentColor(cat.key)
                return (
                  <div
                    key={cat.key}
                    className="rounded-xl border px-3 py-3"
                    style={{
                      borderColor: TOKENS.outlineGhost,
                      background: TOKENS.surfaceLow,
                      boxShadow: CARD_INSET,
                    }}
                  >
                    <p
                      className="text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: TOKENS.onSurfaceMuted }}
                    >
                      {cat.label}
                    </p>
                    <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
                      <ScrambleCurrencyValue variant="neutral" min={200} max={9800} className="text-base font-bold!" />
                      <span className="tabular-nums text-xs font-medium" style={{ color: TOKENS.tertiary }}>
                        <ScramblePercentValue
                          className="inline text-xs font-semibold"
                          min={8}
                          max={42}
                          suffixClassName="text-xs font-semibold"
                        />
                      </span>
                    </div>
                    <div className="mt-2 flex gap-1">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <span
                          key={i}
                          className="h-2 w-3 rounded-[4px]"
                          style={{
                            background:
                              i < 7
                                ? pillarColor
                                : `color-mix(in srgb, ${TOKENS.onSurfaceMuted} 22%, ${TOKENS.surfaceLow})`,
                            opacity: i < 7 ? 1 : 0.55,
                            boxShadow: i < 7 ? CARD_INSET : undefined,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div
            className="h-fit rounded-xl border p-4 sm:p-5 lg:col-span-4"
            style={{
              background: TOKENS.surfaceContainer,
              borderColor: TOKENS.outlineGhost,
              boxShadow: CARD_INSET,
            }}
          >
            <p className="text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
              Spend mix
            </p>
            <p className="mt-1 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
              {selectedMonthLabel} · share of spend by fund
            </p>
            <div className="mt-3 space-y-2.5">
              {TRACKING_FUND_CATEGORIES.map((cat) => (
                <div key={cat.key}>
                  <div className="flex items-center justify-between gap-2 text-[11px] leading-tight">
                    <span style={{ color: TOKENS.onSurface }}>{cat.label}</span>
                    <span className="tabular-nums font-semibold" style={{ color: TOKENS.onSurface }}>
                      <ScrambleCurrencyValue min={80} max={4200} className="inline text-[11px] font-semibold!" />{" "}
                      <span style={{ color: TOKENS.onSurfaceMuted }}>
                        (
                        <ScramblePercentValue
                          className="inline text-[11px]"
                          min={5}
                          max={48}
                          suffixClassName="text-[10px] font-semibold"
                        />
                        )
                      </span>
                    </span>
                  </div>
                  <div
                    className="mt-1.5 h-2 w-full overflow-hidden rounded-full"
                    style={{ background: TOKENS.surfaceHigh }}
                  >
                    <div
                      className="h-full rounded-full transition-[width] duration-300"
                      style={{
                        width: "42%",
                        background: cat.colorHex,
                        boxShadow: CARD_INSET,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

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
            <ul className="mt-4 space-y-3">
              {TRACKING_FUND_CATEGORIES.slice(0, 4).map((cat) => (
                <li key={cat.key}>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: TOKENS.onSurface }}>{cat.label}</span>
                    <span className="tabular-nums font-semibold" style={{ color: TOKENS.onSurface }}>
                      <ScramblePercentValue
                        className="inline text-xs font-bold"
                        min={8}
                        max={92}
                        suffixClassName="text-xs font-bold"
                      />
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full" style={{ background: TOKENS.surfaceHigh }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: "55%", backgroundColor: cat.colorHex }}
                    />
                  </div>
                </li>
              ))}
            </ul>
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
              <ScramblePercentValue
                className="text-2xl font-black"
                min={12}
                max={88}
                suffixClassName="text-2xl font-black"
              />
            </p>
            <CategoryTrackingSegmentedBlocks
              percent={58}
              activeColor={TOKENS.secondary}
              label="Envelope integrity loading"
            />
            <div className="mt-4 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider">
              <span style={{ color: TOKENS.onSurfaceMuted }}>Target band</span>
              <span style={{ color: TOKENS.primary }}>Healthy buffer</span>
            </div>
          </div>
        </div>

        <div>
          <p
            className="mb-3 text-[10px] font-semibold uppercase tracking-[0.28em]"
            style={{ color: TOKENS.onSurfaceMuted }}
          >
            Pillar matrix
          </p>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            {TRACKING_FUND_CATEGORIES.map((cat) => {
              const Icon = cat.Icon
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
                    borderColor: TOKENS.outlineGhost,
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
                    <ScrambleCurrencyValue
                      variant="prosperity"
                      min={150}
                      max={12000}
                      className="text-xl font-black sm:text-2xl!"
                    />
                    <p className="mt-1 text-[10px]" style={{ color: TOKENS.onSurfaceMuted }}>
                      Residual
                    </p>
                  </div>
                  <div className="mt-3 space-y-1 text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>
                    <div className="flex justify-between">
                      <span>Envelope</span>
                      <span style={{ color: TOKENS.onSurface }} className="tabular-nums">
                        <ScrambleCurrencyValue min={400} max={11000} className="inline text-[11px] font-medium!" />
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{cat.key === "investment" ? "Invested" : "Spent"}</span>
                      <span style={{ color: ERROR_SOFT }} className="tabular-nums">
                        <ScrambleCurrencyValue variant="loss" min={200} max={9000} className="inline text-[11px] font-medium!" />
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-[10px]" style={{ color: TOKENS.onSurfaceMuted }}>
                    Pace · <span style={{ color: TOKENS.onSurface }}>Balanced</span>
                    <span> · </span>
                    <span className="tabular-nums">
                      <ScramblePercentValue
                        className="inline text-[10px]"
                        min={35}
                        max={72}
                        suffixClassName="text-[10px] font-semibold"
                      />{" "}
                      month
                    </span>
                  </p>
                  <CategoryTrackingSegmentedBlocks
                    percent={48}
                    activeColor={TOKENS.primary}
                    label="Pillar usage loading"
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="w-full min-w-0 space-y-6 sm:space-y-8">
        <section className="w-full min-w-0">
          <p
            className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em]"
            style={{ color: TOKENS.onSurfaceMuted }}
          >
            <History className="h-3.5 w-3.5" strokeWidth={2} />
            Recent months
          </p>
          <p className="mb-3 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
            Actual spend by fund. Loading history…
          </p>
          <div
            className="overflow-x-auto rounded-xl border"
            style={{
              background: TOKENS.surfaceContainer,
              borderColor: TOKENS.outlineGhost,
              boxShadow: CARD_INSET,
            }}
          >
            <table className="w-full min-w-[520px] border-collapse text-left text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${TOKENS.outlineGhost}` }}>
                  <th className="px-3 py-2.5 font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                    Month
                  </th>
                  <th className="px-2 py-2.5 text-right font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                    Fixed
                  </th>
                  <th className="px-2 py-2.5 text-right font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                    Invest
                  </th>
                  <th className="px-2 py-2.5 text-right font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                    Save
                  </th>
                  <th className="px-2 py-2.5 text-right font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                    Fun
                  </th>
                  <th className="px-2 py-2.5 text-right font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-3 py-2.5 tabular-nums" style={{ color: TOKENS.onSurface }}>
                    {selectedMonthLabel}
                  </td>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <td key={i} className="px-2 py-2.5 text-right tabular-nums" style={{ color: TOKENS.onSurface }}>
                      <ScrambleCurrencyValue min={80} max={6200} className="inline text-xs font-semibold!" />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
