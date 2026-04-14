"use client"

import { useMemo } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { AppSelect } from "@/components/ui/app-select"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "@/lib/income-page-types"
import { useCategoryTrackingPage } from "@/hooks/use-category-tracking-page"
import { TRACKING_FUND_CATEGORIES, expenseTypeLabel } from "@/lib/category-tracking-shared"
import { BENTO } from "@/lib/app-routes"
import {
  TrendingDown,
  Wallet,
  TrendingUp,
  Calendar,
  ArrowRight,
  Activity,
  History,
  Loader2,
} from "lucide-react"
import { CategoryTrackingBentoLoading } from "@/components/category-tracking/category-tracking-bento-loading"

const consoleField =
  "w-full rounded-xl border px-3 py-2.5 text-sm tabular-nums transition-[box-shadow] focus:outline-none focus:ring-2 focus:ring-[#4edea3]/45 [color-scheme:dark]"

/** Matches income “Source Architecture” pillar colors */
const PILLAR_SEGMENTS = [
  { key: "fixedCosts", color: "rgba(248,113,113,0.92)" },
  { key: "savings", color: "rgba(74,222,128,0.92)" },
  { key: "investment", color: "rgba(137,206,255,0.95)" },
  { key: "guiltFreeSpending", color: "rgba(196,181,253,0.92)" },
] as const

function pctOf(whole: number, part: number) {
  if (!whole || whole <= 0) return 0
  return (part / whole) * 100
}

function SegmentedBlocks({
  percent,
  activeColor,
}: {
  percent: number
  activeColor: string
}) {
  const blocks = 14
  const filled = Math.max(0, Math.min(blocks, Math.round((percent / 100) * blocks)))
  return (
    <div className="mt-3 flex gap-1">
      {Array.from({ length: blocks }).map((_, i) => (
        <span
          key={i}
          className="h-2 w-3 rounded-[4px]"
          style={{
            background:
              i < filled
                ? activeColor
                : `color-mix(in srgb, ${TOKENS.onSurfaceMuted} 22%, ${TOKENS.surfaceLow})`,
            boxShadow: i < filled ? CARD_INSET : undefined,
            opacity: i < filled ? 1 : 0.55,
          }}
        />
      ))}
    </div>
  )
}

export function CategoryTrackingBento() {
  const p = useCategoryTrackingPage()
  const {
    status,
    tracking,
    totalIncomeForMonth,
    expenses,
    history,
    loading,
    refreshing,
    selectedMonth,
    selectedYear,
    setSelectedMonth,
    setSelectedYear,
    fetchData,
    monthOptions,
    selectedMonthLabel,
    formatCurrency,
    formatDate,
    totalAllocated,
    totalSpent,
    totalRemaining,
    overallUsage,
    elapsed,
    categoryDistribution,
    allocationMix,
    spendShare,
    expenseTypeRollup,
    momSpend,
  } = p

  const CATEGORIES = TRACKING_FUND_CATEGORIES

  const recentMonthRows = useMemo(() => {
    if (!history?.fixedCosts?.length) return []
    return history.fixedCosts
      .map((_, i) => {
        const fixed = history.fixedCosts[i]?.spent ?? 0
        const investment = history.investment[i]?.spent ?? 0
        const savings = history.savings[i]?.spent ?? 0
        const guilt = history.guiltFreeSpending[i]?.spent ?? 0
        return {
          month: history.fixedCosts[i]?.month ?? "",
          fixed,
          investment,
          savings,
          guilt,
          total: fixed + investment + savings + guilt,
        }
      })
      .slice(-6)
  }, [history])

  const spendMixTotal = useMemo(
    () => categoryDistribution.reduce((s, x) => s + x.value, 0),
    [categoryDistribution],
  )

  if (status === "loading" || status === "unauthenticated") return null

  const hasTracking = tracking != null

  const momGood = momSpend === null ? null : momSpend.delta <= 0
  const runwayPct =
    totalAllocated > 0 ? Math.min(100, (totalRemaining / totalAllocated) * 100) : 0

  return (
    <div className="space-y-6 sm:space-y-8">
      {loading ? (
        <CategoryTrackingBentoLoading
          monthOptions={monthOptions}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          setSelectedMonth={setSelectedMonth}
          setSelectedYear={setSelectedYear}
          selectedMonthLabel={selectedMonthLabel}
        />
      ) : !hasTracking ? (
        <section
          className="rounded-xl border p-10 text-center"
          style={{
            background: TOKENS.surfaceContainer,
            borderColor: TOKENS.outlineGhost,
            boxShadow: CARD_INSET,
          }}
        >
          <p className="text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
            Couldn&apos;t load category data.
          </p>
          <button
            type="button"
            onClick={() => void fetchData({ bypassCache: true })}
            className="mt-4 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-[0.18em]"
            style={{
              border: `1px solid ${TOKENS.outlineGhost}`,
              color: TOKENS.onSurface,
            }}
          >
            Retry
          </button>
        </section>
      ) : (
        <>
          {totalIncomeForMonth === 0 && (
            <div
              className="rounded-xl border px-4 py-3 text-sm"
              style={{
                borderColor: TOKENS.outlineGhost,
                background: `color-mix(in srgb, ${TOKENS.secondary} 10%, ${TOKENS.surfaceLow})`,
                color: TOKENS.onSurface,
              }}
            >
              <span className="font-semibold">No income recorded for {selectedMonthLabel}.</span>{" "}
              <span style={{ color: TOKENS.onSurfaceMuted }}>
                Envelope math waits on inflows — log income from the dashboard flow.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5 lg:items-start">
            {/* Cardless hero — deployable balance */}
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
                    className="inline-flex items-center rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
                    style={{
                      background: `color-mix(in srgb, ${
                        momSpend === null
                          ? TOKENS.onSurfaceMuted
                          : momGood
                            ? TOKENS.primary
                            : ERROR_SOFT
                      } 18%, ${TOKENS.surfaceLow})`,
                      border: `1px solid ${TOKENS.outlineGhost}`,
                      color:
                        momSpend === null
                          ? TOKENS.onSurfaceMuted
                          : momGood
                            ? TOKENS.primary
                            : ERROR_SOFT,
                      boxShadow: CARD_INSET,
                    }}
                  >
                    {momSpend ? (
                      <>
                        {momGood ? (
                          <TrendingDown className="mr-2 h-4 w-4" strokeWidth={2} />
                        ) : (
                          <TrendingUp className="mr-2 h-4 w-4" strokeWidth={2} />
                        )}
                        {momSpend.delta > 0 ? "+" : ""}
                        {formatCurrency(momSpend.delta)}
                        <span className="ml-1.5 opacity-80">6-mo hist vs prior</span>
                        {momSpend.pct != null && (
                          <span className="ml-1 opacity-75">
                            ({momSpend.pct > 0 ? "+" : ""}
                            {momSpend.pct.toFixed(1)}%)
                          </span>
                        )}
                      </>
                    ) : (
                      <span>—</span>
                    )}
                  </div>
                </div>

                <p
                  className="mt-3 text-[10px] font-semibold uppercase tracking-[0.22em]"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Deployable balance
                </p>
                <div className="mt-2 text-4xl font-black leading-none tracking-tight sm:text-5xl lg:text-[3.5rem]">
                  <MajorFigureCurrency
                    amount={totalRemaining}
                    variant="prosperity"
                    className="font-black!"
                    decimalEm={0.45}
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
                    <p className="text-lg font-bold tabular-nums" style={{ color: TOKENS.onSurface }}>
                      {overallUsage.toFixed(1)}%
                    </p>
                  </div>
                  <SegmentedBlocks percent={overallUsage} activeColor={TOKENS.primary} />
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider">
                    <span style={{ color: TOKENS.onSurfaceMuted }}>Residual runway</span>
                    <span style={{ color: runwayPct > 35 ? TOKENS.primary : ERROR_SOFT }}>
                      {runwayPct.toFixed(0)}% unspent
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
                      <MajorFigureCurrency
                        amount={totalIncomeForMonth ?? 0}
                        variant="income"
                        className="text-lg font-bold!"
                        decimalEm={0.45}
                      />
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
                      <MajorFigureCurrency
                        amount={totalAllocated}
                        variant="neutral"
                        className="text-lg font-bold!"
                        decimalEm={0.45}
                      />
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
                      <MajorFigureCurrency
                        amount={totalSpent}
                        variant="loss"
                        className="text-lg font-bold!"
                        decimalEm={0.45}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Command surface — top row only */}
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
                  Select the statement month, then route spend or adjust envelopes. Fund weights live in
                  settings.
                </p>

                <div
                  className="mt-6 flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.22em]"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 shrink-0" style={{ color: TOKENS.onSurfaceMuted }} />
                    <span>Period</span>
                  </div>
                  {refreshing ? (
                    <span
                      className="inline-flex items-center gap-1.5 normal-case tracking-normal"
                      style={{ color: TOKENS.secondary }}
                      aria-live="polite"
                    >
                      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden />
                      Syncing
                    </span>
                  ) : null}
                </div>
                <div className="mt-2">
                  <AppSelect
                    value={`${selectedYear}-${selectedMonth}`}
                    onValueChange={(v) => {
                      const [y, m] = v.split("-").map(Number)
                      setSelectedYear(y)
                      setSelectedMonth(m)
                    }}
                    variant="console"
                    className={cn(consoleField, "mt-1 border-transparent")}
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

          {/* Full-width stack: allocation + everything below */}
          <div className="w-full min-w-0 space-y-6 sm:space-y-8">
            {/* Allocation + spend mix — side-by-side on large screens */}
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-5">
              {/* Allocation schema — income panel parity */}
              <div
                className={cn(
                  "rounded-xl border p-5 sm:p-6 lg:p-7",
                  categoryDistribution.length > 0 && spendMixTotal > 0 ? "lg:col-span-8" : "lg:col-span-12",
                )}
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

                {allocationMix.length > 0 && totalIncomeForMonth ? (
                  <>
                    <div
                      className="mt-5 flex h-2.5 w-full min-w-0 overflow-hidden rounded-full"
                      style={{ background: TOKENS.surfaceHigh }}
                      role="img"
                      aria-label="Allocation split across pillars"
                    >
                      {allocationMix.map((a) => {
                        const seg = PILLAR_SEGMENTS.find((s) => s.key === a.key)
                        const w = totalIncomeForMonth > 0 ? Math.max(0, (a.amount / totalIncomeForMonth) * 100) : 0
                        if (w <= 0) return null
                        return (
                          <div
                            key={a.key}
                            className="min-w-[2px] shrink-0"
                            style={{ width: `${w}%`, background: seg?.color ?? a.color }}
                          />
                        )
                      })}
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {allocationMix.map((a) => {
                        const cat = CATEGORIES.find((c) => c.key === a.key)
                        const pct = pctOf(totalIncomeForMonth, a.amount)
                        const filled = Math.round((pct / 100) * 12)
                        const seg = PILLAR_SEGMENTS.find((s) => s.key === a.key)
                        return (
                          <div
                            key={a.key}
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
                              {cat?.label ?? a.key}
                            </p>
                            <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
                              <MajorFigureCurrency
                                amount={a.amount}
                                variant="neutral"
                                className="text-base font-bold!"
                                decimalEm={0.45}
                              />
                              <span className="tabular-nums text-xs font-medium" style={{ color: TOKENS.tertiary }}>
                                {pct.toFixed(1)}%
                              </span>
                            </div>
                            <div className="mt-2 flex gap-1">
                              {Array.from({ length: 12 }).map((_, i) => (
                                <span
                                  key={i}
                                  className="h-2 w-3 rounded-[4px]"
                                  style={{
                                    background:
                                      i < filled
                                        ? seg?.color ?? a.color
                                        : `color-mix(in srgb, ${TOKENS.onSurfaceMuted} 22%, ${TOKENS.surfaceLow})`,
                                    opacity: i < filled ? 1 : 0.55,
                                    boxShadow: i < filled ? CARD_INSET : undefined,
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <p className="mt-5 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
                    No allocation to visualize — income or balances may be zero.
                  </p>
                )}
              </div>

              {categoryDistribution.length > 0 && spendMixTotal > 0 ? (
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
                    {categoryDistribution.map((d) => {
                      const pct = spendMixTotal > 0 ? (d.value / spendMixTotal) * 100 : 0
                      return (
                        <div key={d.name}>
                          <div className="flex items-center justify-between gap-2 text-[11px] leading-tight">
                            <span style={{ color: TOKENS.onSurface }}>{d.name}</span>
                            <span className="tabular-nums font-semibold" style={{ color: TOKENS.onSurface }}>
                              {formatCurrency(d.value)}{" "}
                              <span style={{ color: TOKENS.onSurfaceMuted }}>({pct.toFixed(0)}%)</span>
                            </span>
                          </div>
                          <div
                            className="mt-1.5 h-2 w-full overflow-hidden rounded-full"
                            style={{ background: TOKENS.surfaceHigh }}
                          >
                            <div
                              className="h-full rounded-full transition-[width] duration-300"
                              style={{
                                width: `${pct}%`,
                                background: d.color,
                                boxShadow: CARD_INSET,
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>

              {/* Deployment pressure + ingress */}
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
                          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full" style={{ background: TOKENS.surfaceHigh }}>
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Math.min(100, s.pct)}%`, backgroundColor: s.color }}
                            />
                          </div>
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
                  <SegmentedBlocks percent={runwayPct} activeColor={TOKENS.secondary} />
                  <div className="mt-4 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider">
                    <span style={{ color: TOKENS.onSurfaceMuted }}>Target band</span>
                    <span style={{ color: runwayPct >= 20 ? TOKENS.primary : ERROR_SOFT }}>
                      {runwayPct >= 20 ? "Healthy buffer" : "Tight"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Asymmetric pillar matrix */}
              <div>
                <p
                  className="mb-3 text-[10px] font-semibold uppercase tracking-[0.28em]"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Pillar matrix
                </p>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                  {CATEGORIES.map((cat) => {
                    const data = tracking![cat.key]
                    if (!data) return null
                    const isOverspent = data.overspent > 0
                    const usagePercent =
                      data.allocated > 0 ? (data.spent / data.allocated) * 100 : 0
                    const Icon = cat.Icon
                    let paceLabel = "—"
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
                      <div
                        key={cat.key}
                        className={cn("rounded-xl border p-4 sm:p-5", span)}
                        style={{
                          background: TOKENS.surfaceLow,
                          borderColor: isOverspent ? ERROR_SOFT : TOKENS.outlineGhost,
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
                          <MajorFigureCurrency
                            amount={data.remaining}
                            variant={isOverspent ? "loss" : "prosperity"}
                            className="text-xl font-black sm:text-2xl!"
                            decimalEm={0.4}
                          />
                          <p className="mt-1 text-[10px]" style={{ color: isOverspent ? ERROR_SOFT : TOKENS.onSurfaceMuted }}>
                            {isOverspent ? `Breach ${formatCurrency(data.overspent)}` : "Residual"}
                          </p>
                        </div>
                        <div className="mt-3 space-y-1 text-[11px]" style={{ color: TOKENS.onSurfaceMuted }}>
                          <div className="flex justify-between">
                            <span>Envelope</span>
                            <span style={{ color: TOKENS.onSurface }}>{formatCurrency(data.allocated)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{cat.key === "investment" ? "Invested" : "Spent"}</span>
                            <span style={{ color: ERROR_SOFT }}>{formatCurrency(data.spent)}</span>
                          </div>
                          {(data.carryover > 0 || data.overspending > 0) && (
                            <div className="border-t pt-2" style={{ borderColor: TOKENS.outlineGhost }}>
                              {data.carryover > 0 && (
                                <div className="flex justify-between" style={{ color: TOKENS.primary }}>
                                  <span>Carry</span>
                                  <span>+{formatCurrency(data.carryover)}</span>
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
                        <SegmentedBlocks
                          percent={Math.min(100, usagePercent)}
                          activeColor={isOverspent ? ERROR_SOFT : TOKENS.primary}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
          </div>

          {/* History + ledger — full-width stack */}
          <div className="w-full min-w-0 space-y-6 sm:space-y-8">
            {recentMonthRows.length > 0 ? (
              <section className="w-full min-w-0">
                <p
                  className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em]"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  <History className="h-3.5 w-3.5" strokeWidth={2} />
                  Recent months
                </p>
                <p className="mb-3 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
                  Actual spend by fund — last {recentMonthRows.length} month{recentMonthRows.length === 1 ? "" : "s"} on file
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
                          Inv.
                        </th>
                        <th className="px-2 py-2.5 text-right font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                          Save
                        </th>
                        <th className="px-2 py-2.5 text-right font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                          Fun
                        </th>
                        <th className="px-3 py-2.5 text-right font-semibold uppercase tracking-wider" style={{ color: TOKENS.primary }}>
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentMonthRows.map((row) => (
                        <tr
                          key={row.month}
                          style={{ borderBottom: `1px solid color-mix(in srgb, ${TOKENS.outlineGhost} 55%, transparent)` }}
                        >
                          <td className="px-3 py-2 font-medium tabular-nums" style={{ color: TOKENS.onSurface }}>
                            {row.month}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums" style={{ color: TOKENS.onSurface }}>
                            {formatCurrency(row.fixed)}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums" style={{ color: TOKENS.onSurface }}>
                            {formatCurrency(row.investment)}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums" style={{ color: TOKENS.onSurface }}>
                            {formatCurrency(row.savings)}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums" style={{ color: TOKENS.onSurface }}>
                            {formatCurrency(row.guilt)}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold tabular-nums" style={{ color: TOKENS.onSurface }}>
                            {formatCurrency(row.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            <div
              className="w-full min-w-0 rounded-xl border p-5 sm:p-6"
              style={{
                background: TOKENS.surfaceContainer,
                borderColor: TOKENS.outlineGhost,
                boxShadow: CARD_INSET,
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.primary }}>
                    Ledger excerpt
                  </p>
                  <p className="mt-1 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
                    {expenses.length} lines · fund-tagged
                  </p>
                </div>
                <Link
                  href={BENTO.expenses}
                  className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: TOKENS.primary }}
                >
                  Open ledger
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {expenseTypeRollup.length > 0 && (
                <div className="mt-4 border-b pb-4" style={{ borderColor: TOKENS.outlineGhost }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TOKENS.onSurfaceMuted }}>
                    Top expense archetypes
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {expenseTypeRollup.slice(0, 5).map((row) => (
                      <span
                        key={row.key}
                        className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
                        style={{
                          border: `1px solid ${TOKENS.outlineGhost}`,
                          color: TOKENS.tertiary,
                          background: TOKENS.surfaceHigh,
                        }}
                      >
                        {row.label} · {formatCurrency(row.amount)}
                      </span>
                    ))}
                  </ul>
                </div>
              )}

              {expenses.length === 0 ? (
                <p className="mt-4 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
                  No expenses in range.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {expenses.slice(0, 6).map((expense) => {
                    const fund = CATEGORIES.find((c) => c.key === expense.category)
                    return (
                      <li
                        key={expense.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5"
                        style={{
                          background: TOKENS.surfaceLow,
                          borderColor: TOKENS.outlineGhost,
                          boxShadow: CARD_INSET,
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                              style={{
                                border: `1px solid ${TOKENS.outlineGhost}`,
                                color: TOKENS.secondary,
                                background: TOKENS.surfaceHigh,
                              }}
                            >
                              {fund?.short ?? expense.category}
                            </span>
                            {expense.expenseCategory ? (
                              <span className="text-[10px]" style={{ color: TOKENS.onSurfaceMuted }}>
                                {expenseTypeLabel(expense.expenseCategory)}
                              </span>
                            ) : null}
                          </div>
                          {expense.description ? (
                            <p className="mt-0.5 truncate text-sm" style={{ color: TOKENS.onSurface }}>
                              {expense.description}
                            </p>
                          ) : null}
                          <p className="text-[10px]" style={{ color: TOKENS.onSurfaceMuted }}>
                            {expense.account?.name} · {formatDate(expense.date)}
                          </p>
                        </div>
                        <MajorFigureCurrency
                          amount={expense.amount}
                          variant="loss"
                          className="text-sm font-bold!"
                          decimalEm={0.4}
                        />
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
