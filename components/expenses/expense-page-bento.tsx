"use client"

import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DateInput } from "@/components/ui/date-input"
import { AppSelect } from "@/components/ui/app-select"
import { cn } from "@/lib/utils"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import {
  ScrambleCurrencyValue,
  ScramblePercentValue,
} from "@/components/ui/scramble-number"
import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "@/lib/income-page-types"
import {
  EXPENSE_CATEGORIES,
  FUND_CATEGORIES,
  FREQUENCIES,
} from "@/lib/expense-page-constants"
import { ConsolePaginationBar } from "@/components/wealth-console/console-pagination"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import type { UseExpensePageResult } from "@/hooks/use-expense-page"
import {
  Calendar,
  ChevronDown,
  Download,
  Filter,
  Play,
  PieChart as PieChartIcon,
  Plus,
  Repeat,
  TrendingDown,
  TrendingUp,
  Trash2,
} from "lucide-react"
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts"

const consoleField =
  "mt-1 w-full rounded-xl border px-3 py-2.5 text-sm tabular-nums transition-[box-shadow] focus:outline-none focus:ring-2 focus:ring-[#4edea3]/45 [color-scheme:dark]"

function fundLabel(v: string | null) {
  if (!v) return ""
  return FUND_CATEGORIES.find((c) => c.value === v)?.label ?? v
}

function expenseLabel(v: string | null) {
  if (!v) return ""
  return EXPENSE_CATEGORIES.find((c) => c.value === v)?.label ?? v
}

function pctOf(total: number, part: number) {
  if (total <= 0) return 0
  return (part / total) * 100
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

export function ExpensePageBento(p: UseExpensePageResult) {
  const [logOpen, setLogOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [recurringOpen, setRecurringOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const historySectionRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (historyOpen) {
      void p.ensureExpensesLoaded()
    }
  }, [historyOpen, p])

  useEffect(() => {
    if (recurringOpen || p.showRecurringForm) {
      void p.ensureRecurringLoaded()
    }
  }, [recurringOpen, p])

  const submitLog = async (e: React.FormEvent) => {
    const ok = await p.handleSubmit(e)
    if (ok) setLogOpen(false)
  }

  const perf = p.expenseStats.monthOverMonthPct
  /** Lower spend vs last month reads as positive (green). */
  const perfGood = perf === null || perf <= 0

  const monthTotal = p.expenseStats.currentMonthTotal || 0
  const fund = p.expenseStats.fundBreakdownCurrentMonth ?? {
    fixedCosts: 0,
    investment: 0,
    savings: 0,
    guiltFreeSpending: 0,
  }
  const fixedPct = pctOf(monthTotal, fund.fixedCosts)
  const investPct = pctOf(monthTotal, fund.investment)

  const fixedThreshold = 60
  const investTarget = 30
  const fixedOver = fixedPct > fixedThreshold
  const investOver = investPct > investTarget + 5

  const liquidity = p.accounts.reduce((sum, a) => sum + (a.balance || 0), 0)
  const runwayMonths = monthTotal > 0 ? liquidity / monthTotal : null
  const subcategoryInsights = p.expenseStats.subcategoryInsights
  const topCategories = subcategoryInsights.topCategories
  const leadCategory = topCategories[0] ?? null
  const classifiedSharePct = pctOf(monthTotal, subcategoryInsights.totalClassified)
  const unclassifiedSharePct = pctOf(monthTotal, subcategoryInsights.unclassifiedAmount)
  const categoryPalette = [
    TOKENS.primary,
    TOKENS.secondary,
    "#f3c969",
    "#e88d67",
    "#7dd3b0",
    "#9db4ff",
  ]
  const categoryChartData = topCategories.map((category, index) => ({
    ...category,
    fill: categoryPalette[index % categoryPalette.length],
  }))
  const shareChartData =
    subcategoryInsights.unclassifiedAmount > 0
      ? [
          ...categoryChartData,
          {
            category: "unclassified",
            label: "Unclassified",
            amount: subcategoryInsights.unclassifiedAmount,
            sharePct: unclassifiedSharePct,
            fill: "rgba(218, 226, 253, 0.2)",
            count: 0,
          },
        ]
      : categoryChartData
  const activeSubcategory =
    shareChartData.find((entry) => entry.category === selectedSubcategory) ??
    shareChartData[0] ??
    null
  const showSummarySkeleton =
    p.loadingSummary &&
    p.expenseStats.currentMonthTotal === 0 &&
    p.expenseStats.ytdTotal === 0

  const openHistoryForCategory = (category: string) => {
    if (category === "unclassified") return
    p.setFilterExpenseCategory(category)
    const scrollToHistory = () => {
      historySectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }

    if (historyOpen) {
      scrollToHistory()
      return
    }

    setHistoryOpen(true)
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToHistory)
    })
  }

  return (
    <>
      {p.message && (
        <div
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            background:
              p.message.type === "success"
                ? `color-mix(in srgb, ${TOKENS.primary} 12%, ${TOKENS.surfaceLow})`
                : `color-mix(in srgb, ${ERROR_SOFT} 12%, ${TOKENS.surfaceLow})`,
            borderColor:
              p.message.type === "success"
                ? TOKENS.outlineGhost
                : `color-mix(in srgb, ${ERROR_SOFT} 35%, transparent)`,
            color:
              p.message.type === "success" ? TOKENS.primary : ERROR_SOFT,
          }}
        >
          {p.message.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
          <section className="lg:col-span-8">
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
                    Live capital outflow
                  </p>
                </div>
                <div
                  className="inline-flex items-center rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
                  style={{
                    background: `color-mix(in srgb, ${TOKENS.primary} 18%, ${TOKENS.surfaceLow})`,
                    border: `1px solid ${TOKENS.outlineGhost}`,
                    color: TOKENS.primary,
                    boxShadow: CARD_INSET,
                  }}
                >
                  {perf !== null ? (
                    <>
                      {perfGood ? (
                        <TrendingDown className="mr-2 h-4 w-4" strokeWidth={2} />
                      ) : (
                        <TrendingUp className="mr-2 h-4 w-4" strokeWidth={2} />
                      )}
                      {perfGood ? "" : "+"}
                      {perf.toFixed(1)}% vs prev. month
                    </>
                  ) : (
                    <span>—</span>
                  )}
                </div>
              </div>

              <div className="mt-4 text-4xl font-black leading-none tracking-tight sm:text-5xl lg:text-[3.6rem]">
                {showSummarySkeleton ? (
                  <ScrambleCurrencyValue
                    variant="loss"
                    min={400}
                    max={5400}
                    className="font-black!"
                  />
                ) : (
                  <MajorFigureCurrency
                    amount={p.expenseStats.currentMonthTotal}
                    variant="loss"
                    className="font-black!"
                  />
                )}
              </div>

              <div className="mt-4">
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  YTD aggregate
                </p>
                {showSummarySkeleton ? (
                  <div className="mt-2 text-lg font-semibold tabular-nums">
                    <ScrambleCurrencyValue
                      min={3000}
                      max={48000}
                      className="font-semibold!"
                    />
                  </div>
                ) : (
                  <p
                    className="mt-2 text-lg font-semibold tabular-nums"
                    style={{ color: TOKENS.onSurface }}
                  >
                    {p.formatCurrency(p.expenseStats.ytdTotal)}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                      Fixed overhead
                    </p>
                    <p
                      className="mt-1 text-xs italic"
                      style={{ color: TOKENS.onSurfaceMuted }}
                    >
                      Fixed recurring outflows
                    </p>
                  </div>
                  {showSummarySkeleton ? (
                    <ScramblePercentValue
                      className="text-lg font-bold tabular-nums"
                      color={TOKENS.onSurface}
                      min={18}
                      max={82}
                    />
                  ) : (
                    <p
                      className="text-lg font-bold tabular-nums"
                      style={{ color: TOKENS.onSurface }}
                    >
                      {Number.isFinite(fixedPct) ? fixedPct.toFixed(0) : "0"}%
                    </p>
                  )}
                </div>
                <SegmentedBlocks
                  percent={fixedPct}
                  activeColor={TOKENS.secondary}
                />
                <div className="mt-4 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider">
                  <span style={{ color: TOKENS.onSurfaceMuted }}>
                    Threshold {fixedThreshold.toFixed(0)}%
                  </span>
                  <span style={{ color: fixedOver ? ERROR_SOFT : TOKENS.primary }}>
                    {fixedOver ? "Over threshold" : "Optimized"}
                  </span>
                </div>
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
                      Investment capital
                    </p>
                    <p
                      className="mt-1 text-xs italic"
                      style={{ color: TOKENS.onSurfaceMuted }}
                    >
                      Growth-focused deployments
                    </p>
                  </div>
                  {showSummarySkeleton ? (
                    <ScramblePercentValue
                      className="text-lg font-bold tabular-nums"
                      color={TOKENS.onSurface}
                      min={6}
                      max={44}
                    />
                  ) : (
                    <p
                      className="text-lg font-bold tabular-nums"
                      style={{ color: TOKENS.onSurface }}
                    >
                      {Number.isFinite(investPct) ? investPct.toFixed(0) : "0"}%
                    </p>
                  )}
                </div>
                <SegmentedBlocks
                  percent={investPct}
                  activeColor={TOKENS.primary}
                />
                <div className="mt-4 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider">
                  <span style={{ color: TOKENS.onSurfaceMuted }}>
                    Strategic allocation {investTarget.toFixed(0)}%
                  </span>
                  <span style={{ color: investOver ? ERROR_SOFT : TOKENS.primary }}>
                    {investOver ? "Over threshold" : "Optimized"}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="lg:col-span-4">
            <div
              className="rounded-xl border p-6 sm:p-7"
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
                Command actions
              </p>
              <p
                className="mt-3 text-sm leading-snug"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Instantiate a new ledger entry with multi-entity reconciliation
                and categorical tagging.
              </p>

              <button
                type="button"
                onClick={() => setLogOpen(true)}
                disabled={p.loadingAccounts}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-xs font-bold uppercase tracking-[0.2em] transition-opacity hover:opacity-95"
                style={{
                  background: TOKENS.primary,
                  color: TOKENS.surface,
                  boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
                }}
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                {p.loadingAccounts ? "Connecting accounts..." : "Log new expense"}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (p.loadingAccounts) return
                  p.setShowBulkForm(true)
                  p.setMessage(null)
                  if (p.accounts.length && !p.bulkAccountId) {
                    p.setBulkAccountId(
                      p.accounts.find((a) => a.isDefault)?.id || p.accounts[0].id,
                    )
                  }
                }}
                disabled={p.loadingAccounts}
                className="mt-3 w-full rounded-xl border py-3 text-center text-[10px] font-bold uppercase tracking-[0.18em] transition-opacity hover:opacity-90"
                style={{
                  borderColor: TOKENS.outlineGhost,
                  color: TOKENS.onSurfaceMuted,
                }}
              >
                {p.loadingAccounts ? "Waiting for accounts..." : "Bulk import"}
              </button>
            </div>
          </section>
        </div>

      <section
        className="rounded-[1.75rem] border p-5 sm:p-7"
        style={{
          background: TOKENS.surfaceContainer,
          borderColor: TOKENS.outlineGhost,
          boxShadow: CARD_INSET,
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <PieChartIcon
                className="h-4 w-4"
                style={{ color: TOKENS.primary }}
                strokeWidth={2}
              />
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.28em]"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Spend by sub-category
              </p>
            </div>
            <h3
              className="mt-3 text-xl font-bold tracking-tight sm:text-2xl"
              style={{ color: TOKENS.onSurface }}
            >
              Distribution across the categories that matter most this month
            </h3>
            <p
              className="mt-2 max-w-2xl text-sm"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Chart-first breakdown of where labeled spending is landing right now.
            </p>
          </div>
          <div className="grid min-w-[13rem] grid-cols-2 gap-3 sm:grid-cols-3">
            <div
              className="rounded-2xl border px-4 py-3"
              style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceLow }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: TOKENS.onSurfaceMuted }}>
                Top bucket
              </p>
              <p className="mt-2 text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
                {leadCategory?.label ?? "None"}
              </p>
            </div>
            <div
              className="rounded-2xl border px-4 py-3"
              style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceLow }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: TOKENS.onSurfaceMuted }}>
                Tagged spend
              </p>
              <p className="mt-2 text-sm font-semibold tabular-nums" style={{ color: TOKENS.onSurface }}>
                {classifiedSharePct.toFixed(0)}%
              </p>
            </div>
            <div
              className="rounded-2xl border px-4 py-3"
              style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceLow }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: TOKENS.onSurfaceMuted }}>
                Avg ticket
              </p>
              <p className="mt-2 text-sm font-semibold tabular-nums" style={{ color: TOKENS.onSurface }}>
                {p.formatCurrency(subcategoryInsights.averageEntryAmount)}
              </p>
            </div>
          </div>
        </div>

        {showSummarySkeleton ? (
          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div
              className="rounded-[1.5rem] border p-4 sm:p-5"
              style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceLow }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
                    Share of spend
                  </p>
                  <p className="mt-2 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
                    Loading category distribution.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-col items-center gap-5">
                <div
                  className="h-[260px] w-[260px] rounded-full"
                  style={{ background: TOKENS.surfaceContainer }}
                />
                <div
                  className="grid w-full grid-cols-2 gap-3 rounded-[1.25rem] border p-4"
                  style={{
                    borderColor: TOKENS.outlineGhost,
                    background: TOKENS.surfaceContainer,
                  }}
                >
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: TOKENS.onSurfaceMuted }}>
                      Spend
                    </p>
                    <div className="mt-2 text-sm font-semibold tabular-nums">
                      <ScrambleCurrencyValue min={120} max={1800} className="font-semibold!" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: TOKENS.onSurfaceMuted }}>
                      Share
                    </p>
                    <div className="mt-2 text-sm font-semibold tabular-nums">
                      <ScramblePercentValue
                        className="text-sm font-semibold tabular-nums"
                        color={TOKENS.onSurface}
                        min={8}
                        max={64}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div
                className="rounded-[1.5rem] border p-4 sm:p-5"
                style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceLow }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
                  Category ledger
                </p>
                <div className="mt-4 space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="grid w-full grid-cols-[auto_1fr_auto_auto] items-center gap-3 rounded-xl border px-3 py-3"
                      style={{
                        borderColor: TOKENS.outlineGhost,
                        background: "transparent",
                      }}
                    >
                      <span
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold"
                        style={{
                          color: TOKENS.primary,
                          background: TOKENS.surfaceContainer,
                          border: `1px solid ${TOKENS.outlineGhost}`,
                        }}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <div
                          className="h-4 w-28 rounded-md"
                          style={{ background: TOKENS.surfaceContainer }}
                        />
                        <div
                          className="mt-2 h-3 w-16 rounded-md"
                          style={{ background: TOKENS.surfaceContainer }}
                        />
                      </div>
                      <div className="text-right">
                        <ScrambleCurrencyValue min={50} max={1200} className="text-sm font-semibold!" />
                      </div>
                      <div className="text-right">
                        <ScramblePercentValue
                          className="text-sm font-semibold tabular-nums"
                          color={TOKENS.onSurface}
                          min={4}
                          max={34}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : topCategories.length === 0 ? (
          <div
            className="mt-6 rounded-2xl border px-5 py-12 text-center"
            style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceLow }}
          >
            <p className="text-base font-semibold" style={{ color: TOKENS.onSurface }}>
              No tagged sub-categories yet
            </p>
            <p className="mt-2 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
              Add expense types to your entries and this chart view will populate automatically.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div
              className="rounded-[1.5rem] border p-4 sm:p-5"
              style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceLow }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
                    Share of spend
                  </p>
                  <p className="mt-2 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
                    Click a slice to spotlight a category and jump to its ledger history.
                  </p>
                </div>
                {activeSubcategory && activeSubcategory.category !== "unclassified" ? (
                  <button
                    type="button"
                    onClick={() => openHistoryForCategory(activeSubcategory.category)}
                    className="rounded-lg border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em]"
                    style={{
                      borderColor: TOKENS.outlineGhost,
                      color: TOKENS.primary,
                      background: TOKENS.surfaceContainer,
                    }}
                  >
                    View in history
                  </button>
                ) : null}
              </div>
              <div className="mt-4 flex flex-col items-center gap-5">
                <div className="h-[260px] w-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={shareChartData}
                        dataKey="amount"
                        nameKey="label"
                        innerRadius={64}
                        outerRadius={100}
                        paddingAngle={2}
                        stroke="none"
                        onClick={(_, index) => {
                          const clicked = shareChartData[index]
                          if (clicked) setSelectedSubcategory(clicked.category)
                        }}
                      >
                        {shareChartData.map((entry) => (
                          <Cell
                            key={entry.category}
                            fill={entry.fill}
                            fillOpacity={
                              selectedSubcategory === null ||
                              selectedSubcategory === entry.category
                                ? 1
                                : 0.35
                            }
                            stroke={
                              selectedSubcategory === entry.category
                                ? TOKENS.onSurface
                                : "transparent"
                            }
                            strokeWidth={selectedSubcategory === entry.category ? 1.5 : 0}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: TOKENS.surface,
                          borderColor: TOKENS.outlineGhost,
                          borderRadius: "16px",
                          color: TOKENS.onSurface,
                        }}
                        labelStyle={{ color: TOKENS.onSurface }}
                        itemStyle={{ color: TOKENS.onSurface }}
                        wrapperStyle={{ color: TOKENS.onSurface }}
                        formatter={(value, _name, item) => {
                          const n =
                            typeof value === "number"
                              ? value
                              : parseFloat(String(value ?? 0))
                          return [
                            p.formatCurrency(Number.isFinite(n) ? n : 0),
                            item.payload.label,
                          ]
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {activeSubcategory && (
                  <div
                    className="grid w-full grid-cols-2 gap-3 rounded-[1.25rem] border p-4"
                    style={{
                      borderColor: TOKENS.outlineGhost,
                      background: TOKENS.surfaceContainer,
                    }}
                  >
                    <div className="col-span-2 flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: activeSubcategory.fill }}
                      />
                      <p className="text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
                        {activeSubcategory.label}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: TOKENS.onSurfaceMuted }}>
                        Spend
                      </p>
                      <p className="mt-2 text-sm font-semibold tabular-nums" style={{ color: TOKENS.onSurface }}>
                        {p.formatCurrency(activeSubcategory.amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: TOKENS.onSurfaceMuted }}>
                        Share
                      </p>
                      <p className="mt-2 text-sm font-semibold tabular-nums" style={{ color: TOKENS.onSurface }}>
                        {activeSubcategory.sharePct.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                )}
                <div className="grid w-full grid-cols-2 gap-3">
                  <div
                    className="rounded-xl border px-4 py-3"
                    style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceContainer }}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: TOKENS.onSurfaceMuted }}>
                      Tagged
                    </p>
                    <p className="mt-2 text-sm font-semibold tabular-nums" style={{ color: TOKENS.onSurface }}>
                      {classifiedSharePct.toFixed(0)}%
                    </p>
                  </div>
                  <div
                    className="rounded-xl border px-4 py-3"
                    style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceContainer }}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: TOKENS.onSurfaceMuted }}>
                      Unclassified
                    </p>
                    <p className="mt-2 text-sm font-semibold tabular-nums" style={{ color: TOKENS.onSurface }}>
                      {unclassifiedSharePct.toFixed(0)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div
                className="rounded-[1.5rem] border p-4 sm:p-5"
                style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceLow }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
                  Category ledger
                </p>
                <div className="mt-4 space-y-3">
                  {categoryChartData.map((category, index) => (
                    <button
                      type="button"
                      key={category.category}
                      onClick={() => setSelectedSubcategory(category.category)}
                      className="grid w-full grid-cols-[auto_1fr_auto_auto] items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors"
                      style={{
                        borderColor:
                          selectedSubcategory === category.category
                            ? category.fill
                            : TOKENS.outlineGhost,
                        background:
                          selectedSubcategory === category.category
                            ? TOKENS.surfaceContainer
                            : "transparent",
                      }}
                    >
                      <span
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold"
                        style={{
                          color: category.fill,
                          background: TOKENS.surfaceContainer,
                          border: `1px solid ${TOKENS.outlineGhost}`,
                        }}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium" style={{ color: TOKENS.onSurface }}>
                          {category.label}
                        </p>
                        <p className="text-[11px] tabular-nums" style={{ color: TOKENS.onSurfaceMuted }}>
                          {category.count} transactions
                        </p>
                      </div>
                      <span className="text-sm tabular-nums" style={{ color: TOKENS.onSurfaceMuted }}>
                        {category.sharePct.toFixed(1)}%
                      </span>
                      <span className="text-sm font-semibold tabular-nums" style={{ color: TOKENS.onSurface }}>
                        {p.formatCurrency(category.amount)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent
          className="relative max-h-[90vh] overflow-y-auto border p-0 shadow-2xl"
          style={{
            background: TOKENS.surfaceContainer,
            borderColor: TOKENS.outlineGhost,
            boxShadow:
              "0 24px 48px rgba(0,0,0,0.5), inset 0 1px 0 0 rgba(218,226,253,0.06)",
          }}
        >
          <DialogClose onClose={() => setLogOpen(false)} />
          <div className="p-6 sm:p-8">
            <DialogHeader>
              <DialogTitle
                className="text-xl"
                style={{ color: TOKENS.onSurface }}
              >
                Log expense
              </DialogTitle>
              <DialogDescription
                className="text-sm leading-relaxed"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Deduct from an account. Non-cash accounts require a fund
                pillar.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={submitLog} className="mt-6 space-y-5" inert={p.submitting}>
              <div>
                <label
                  htmlFor="exp-account"
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Account *
                </label>
                <AppSelect
                  id="exp-account"
                  value={p.accountId}
                  onValueChange={(v) => {
                    p.setAccountId(v)
                    const a = p.accounts.find((acc) => acc.id === v)
                    if (a?.accountType === "cash") p.setFundCategory("")
                  }}
                  disabled={p.submitting}
                  required
                  variant="console"
                  className={cn(consoleField, "mt-1 border-transparent")}
                  style={{
                    backgroundColor: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                  options={p.accounts.map((account) => ({
                    value: account.id,
                    label: `${account.name} (${account.bankName}) — ${p.formatCurrency(account.balance)}`,
                  }))}
                />
              </div>
              <div>
                <label
                  htmlFor="exp-amt"
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Amount ($) *
                </label>
                <Input
                  id="exp-amt"
                  type="number"
                  min="0"
                  step="0.01"
                  value={p.amount}
                  onChange={(e) => p.setAmount(e.target.value)}
                  required
                  disabled={p.submitting}
                  className={cn(consoleField, "border-transparent")}
                  style={{
                    background: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="exp-date"
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Date *
                </label>
                <DateInput
                  id="exp-date"
                  value={p.date}
                  onChange={(e) => p.setDate(e.target.value)}
                  required
                  disabled={p.submitting}
                  className={cn(consoleField, "border-transparent")}
                  style={{
                    background: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                />
              </div>
              {(() => {
                const sel = p.accounts.find((a) => a.id === p.accountId)
                const cash = sel?.accountType === "cash"
                if (cash) return null
                return (
                  <div>
                    <label
                      htmlFor="exp-fund"
                      className="text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: TOKENS.onSurfaceMuted }}
                    >
                      Fund category *
                    </label>
                    <AppSelect
                      id="exp-fund"
                      value={p.fundCategory}
                      onValueChange={p.setFundCategory}
                      disabled={p.submitting}
                      required
                      variant="console"
                      className={cn(consoleField, "mt-1 border-transparent")}
                      style={{
                        backgroundColor: TOKENS.surfaceLow,
                        borderColor: TOKENS.outlineGhost,
                        color: TOKENS.onSurface,
                      }}
                      placeholder="Select fund"
                      options={[
                        { value: "", label: "Select fund" },
                        ...FUND_CATEGORIES.map((c) => ({
                          value: c.value,
                          label: c.label,
                        })),
                      ]}
                    />
                  </div>
                )
              })()}
              <div>
                <label
                  htmlFor="exp-ec"
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Expense category
                </label>
                <AppSelect
                  id="exp-ec"
                  value={p.expenseCategory}
                  onValueChange={p.setExpenseCategory}
                  disabled={p.submitting}
                  variant="console"
                  className={cn(consoleField, "mt-1 border-transparent")}
                  style={{
                    backgroundColor: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                  placeholder="Optional"
                  options={[
                    { value: "", label: "Optional" },
                    ...EXPENSE_CATEGORIES.map((c) => ({
                      value: c.value,
                      label: c.label,
                    })),
                  ]}
                />
              </div>
              <div>
                <label
                  htmlFor="exp-desc"
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Description
                </label>
                <Input
                  id="exp-desc"
                  type="text"
                  value={p.description}
                  onChange={(e) => p.setDescription(e.target.value)}
                  placeholder="Memo"
                  disabled={p.submitting}
                  className={cn(consoleField, "border-transparent")}
                  style={{
                    background: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={p.submitting}
                className="w-full rounded-xl py-3.5 text-xs font-bold uppercase tracking-[0.2em] transition-opacity disabled:opacity-50"
                style={{
                  background: TOKENS.primary,
                  color: TOKENS.surface,
                  boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
                }}
              >
                {p.submitting ? "Logging…" : "Log expense"}
              </button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={p.showBulkForm}
        onOpenChange={(o) => {
          p.setShowBulkForm(o)
          if (!o) p.setMessage(null)
        }}
      >
        <DialogContent
          className="relative max-h-[90vh] overflow-y-auto border p-0 shadow-2xl"
          style={{
            background: TOKENS.surfaceContainer,
            borderColor: TOKENS.outlineGhost,
            boxShadow:
              "0 24px 48px rgba(0,0,0,0.5), inset 0 1px 0 0 rgba(218,226,253,0.06)",
          }}
        >
          <DialogClose onClose={() => p.setShowBulkForm(false)} />
          <div className="p-6 sm:p-8">
            <DialogHeader>
              <DialogTitle
                className="text-xl"
                style={{ color: TOKENS.onSurface }}
              >
                Bulk import
              </DialogTitle>
              <DialogDescription
                className="text-sm leading-relaxed"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                One line per expense. Columns: date, amount, description, fund,
                expense category (tab or comma).
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={p.handleBulkSubmit} className="mt-6 space-y-5" inert={p.submittingBulk}>
              <div>
                <label
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Account
                </label>
                <AppSelect
                  value={p.bulkAccountId}
                  onValueChange={p.setBulkAccountId}
                  disabled={p.submittingBulk}
                  variant="console"
                  className={cn(consoleField, "mt-1 border-transparent")}
                  style={{
                    backgroundColor: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                  options={p.accounts.map((acc) => ({
                    value: acc.id,
                    label: `${acc.name} (${acc.bankName})`,
                  }))}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    Default fund
                  </label>
                  <AppSelect
                    value={p.bulkFundCategory}
                    onValueChange={p.setBulkFundCategory}
                    disabled={p.submittingBulk}
                    variant="console"
                    className={cn(consoleField, "mt-1 border-transparent")}
                    style={{
                      backgroundColor: TOKENS.surfaceLow,
                      borderColor: TOKENS.outlineGhost,
                      color: TOKENS.onSurface,
                    }}
                    placeholder="—"
                    options={[
                      { value: "", label: "—" },
                      ...FUND_CATEGORIES.map((c) => ({
                        value: c.value,
                        label: c.label,
                      })),
                    ]}
                  />
                </div>
                <div>
                  <label
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    Default expense type
                  </label>
                  <AppSelect
                    value={p.bulkExpenseCategory}
                    onValueChange={p.setBulkExpenseCategory}
                    disabled={p.submittingBulk}
                    variant="console"
                    className={cn(consoleField, "mt-1 border-transparent")}
                    style={{
                      backgroundColor: TOKENS.surfaceLow,
                      borderColor: TOKENS.outlineGhost,
                      color: TOKENS.onSurface,
                    }}
                    placeholder="—"
                    options={[
                      { value: "", label: "—" },
                      ...EXPENSE_CATEGORIES.map((c) => ({
                        value: c.value,
                        label: c.label,
                      })),
                    ]}
                  />
                </div>
              </div>
              <div>
                <label
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Paste rows
                </label>
                <textarea
                  value={p.bulkText}
                  onChange={(e) => p.setBulkText(e.target.value)}
                  rows={8}
                  disabled={p.submittingBulk}
                  className={cn(
                    consoleField,
                    "font-mono text-xs leading-relaxed",
                  )}
                  style={{
                    background: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={p.submittingBulk}
                className="w-full rounded-xl py-3.5 text-xs font-bold uppercase tracking-[0.2em] transition-opacity disabled:opacity-50"
                style={{
                  background: TOKENS.primary,
                  color: TOKENS.surface,
                  boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
                }}
              >
                {p.submittingBulk ? "Adding…" : "Import all"}
              </button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <section
        className="rounded-xl border"
        style={{
          background: TOKENS.surfaceLow,
          borderColor: TOKENS.outlineGhost,
          boxShadow: CARD_INSET,
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border"
              style={{
                borderColor: TOKENS.outlineGhost,
                color: TOKENS.onSurfaceMuted,
                background: TOKENS.surfaceContainer,
              }}
            >
              <Repeat className="h-4 w-4" />
            </span>
            <div className="min-w-0">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Recurring tools
            </p>
            <p
              className="mt-1 text-sm"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              {p.loadingRecurring
                ? "Loading templates..."
                : p.recurring.length === 0
                  ? "No recurring templates configured"
                  : `${p.recurring.length} template${p.recurring.length === 1 ? "" : "s"} available`}
            </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setRecurringOpen((open) => !open)
                p.setMessage(null)
              }}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em]"
              style={{
                borderColor: TOKENS.outlineGhost,
                color: TOKENS.onSurfaceMuted,
                background: TOKENS.surfaceContainer,
              }}
            >
              Manage
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  recurringOpen && "rotate-180",
                )}
              />
            </button>
            <button
              type="button"
              onClick={() => {
                setRecurringOpen(true)
                p.setShowRecurringForm(!p.showRecurringForm)
                p.setMessage(null)
                if (p.accounts.length && !p.recurringAccountId) {
                  p.setRecurringAccountId(
                    p.accounts.find((a) => a.isDefault)?.id || p.accounts[0].id,
                  )
                }
              }}
              className="rounded-lg border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em]"
              style={{
                borderColor: TOKENS.outlineGhost,
                color: TOKENS.onSurfaceMuted,
              }}
            >
              {p.showRecurringForm ? "Close form" : "Add template"}
            </button>
          </div>
        </div>
        {(recurringOpen || p.showRecurringForm) && (
          <div
            className="border-t px-5 py-4 sm:px-6"
            style={{ borderColor: TOKENS.outlineGhost }}
          >
        {p.showRecurringForm && (
          <form
            onSubmit={p.handleAddRecurring}
            className="mt-4 flex flex-col gap-4 rounded-xl border p-4"
            style={{
              borderColor: TOKENS.outlineGhost,
              background: TOKENS.surfaceContainer,
            }}
            inert={p.submittingRecurring}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Account *
                </label>
                <AppSelect
                  value={p.recurringAccountId}
                  onValueChange={p.setRecurringAccountId}
                  required
                  disabled={p.submittingRecurring}
                  variant="console"
                  className={cn(consoleField, "mt-1 border-transparent")}
                  style={{
                    backgroundColor: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                  options={p.accounts.map((acc) => ({
                    value: acc.id,
                    label: acc.name,
                  }))}
                />
              </div>
              <div>
                <label
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Amount *
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={p.recurringAmount}
                  onChange={(e) => p.setRecurringAmount(e.target.value)}
                  disabled={p.submittingRecurring}
                  className={cn(consoleField, "border-transparent")}
                  style={{
                    background: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                />
              </div>
              <div>
                <label
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Frequency
                </label>
                <AppSelect
                  value={p.recurringFrequency}
                  onValueChange={p.setRecurringFrequency}
                  disabled={p.submittingRecurring}
                  variant="console"
                  className={cn(consoleField, "mt-1 border-transparent")}
                  style={{
                    backgroundColor: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                  options={FREQUENCIES.map((f) => ({
                    value: f.value,
                    label: f.label,
                  }))}
                />
              </div>
              <div>
                <label
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Start date
                </label>
              <DateInput
                  value={p.recurringStartDate}
                  onChange={(e) => p.setRecurringStartDate(e.target.value)}
                  disabled={p.submittingRecurring}
                  className={cn(consoleField, "border-transparent")}
                  style={{
                    background: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                />
              </div>
              <div className="sm:col-span-2">
                <label
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Description
                </label>
                <Input
                  value={p.recurringDescription}
                  onChange={(e) => p.setRecurringDescription(e.target.value)}
                  disabled={p.submittingRecurring}
                  className={cn(consoleField, "border-transparent")}
                  style={{
                    background: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                />
              </div>
              <div>
                <label
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Fund
                </label>
                <AppSelect
                  value={p.recurringFundCategory}
                  onValueChange={p.setRecurringFundCategory}
                  disabled={p.submittingRecurring}
                  variant="console"
                  className={cn(consoleField, "mt-1 border-transparent")}
                  style={{
                    backgroundColor: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                  placeholder="—"
                  options={[
                    { value: "", label: "—" },
                    ...FUND_CATEGORIES.map((c) => ({
                      value: c.value,
                      label: c.label,
                    })),
                  ]}
                />
              </div>
              <div>
                <label
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Expense category
                </label>
                <AppSelect
                  value={p.recurringExpenseCategory}
                  onValueChange={p.setRecurringExpenseCategory}
                  disabled={p.submittingRecurring}
                  variant="console"
                  className={cn(consoleField, "mt-1 border-transparent")}
                  style={{
                    backgroundColor: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                  placeholder="—"
                  options={[
                    { value: "", label: "—" },
                    ...EXPENSE_CATEGORIES.map((c) => ({
                      value: c.value,
                      label: c.label,
                    })),
                  ]}
                />
              </div>
              <div>
                <label
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  End date
                </label>
              <DateInput
                  value={p.recurringEndDate}
                  onChange={(e) => p.setRecurringEndDate(e.target.value)}
                  disabled={p.submittingRecurring}
                  className={cn(consoleField, "border-transparent")}
                  style={{
                    background: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={p.submittingRecurring}
              className="rounded-xl py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] disabled:opacity-50"
              style={{
                background: TOKENS.primary,
                color: TOKENS.surface,
              }}
            >
              {p.submittingRecurring ? "Saving…" : "Save template"}
            </button>
          </form>
        )}
        {p.loadingRecurring ? (
          <p className="mt-4 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
            Loading…
          </p>
        ) : p.recurring.length === 0 ? (
          <p className="mt-4 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
            No recurring templates yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {p.recurring.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-3"
                style={{
                  background: TOKENS.surfaceContainer,
                  borderColor: TOKENS.outlineGhost,
                  boxShadow: CARD_INSET,
                }}
              >
                <div className="min-w-0">
                  <MajorFigureCurrency
                    amount={r.amount}
                    variant="loss"
                    className="text-base font-bold!"
                  />
                  <span
                    className="ml-2 text-xs capitalize"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    {r.frequency}
                  </span>
                  {r.description && (
                    <p
                      className="mt-1 truncate text-sm"
                      style={{ color: TOKENS.onSurface }}
                    >
                      {r.description}
                    </p>
                  )}
                  <p
                    className="text-xs"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    {r.account.name}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => p.handleLogRecurring(r.id)}
                    disabled={p.loggingRecurringId !== null}
                    className="rounded-lg border px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide disabled:opacity-50"
                    style={{
                      borderColor: TOKENS.outlineGhost,
                      color: TOKENS.primary,
                    }}
                  >
                    <Play className="mr-1 inline h-3 w-3" />
                    {p.loggingRecurringId === r.id ? "…" : "Log"}
                  </button>
                  <button
                    type="button"
                    onClick={() => p.handleDeleteRecurring(r.id)}
                    className="rounded-lg p-2"
                    style={{ color: ERROR_SOFT }}
                    aria-label="Delete template"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
          </div>
        )}
      </section>

      <section
        ref={historySectionRef}
        className="rounded-xl border"
        style={{
          background: TOKENS.surfaceContainer,
          borderColor: TOKENS.outlineGhost,
          boxShadow: CARD_INSET,
        }}
      >
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-7">
            <div className="min-w-0">
              <h3
                className="text-base font-semibold tracking-tight"
                style={{ color: TOKENS.onSurface }}
              >
                Financial Transaction History
              </h3>
              <p
                className="mt-1 text-xs"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                {p.expensesTotal === 0
                  ? "No entries in the current range"
                  : `Showing ${p.expenses.length} of ${p.expensesTotal} entries`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {historyOpen && (
                <>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:bg-white/6"
                    style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurfaceMuted }}
                    aria-label="Filter"
                    onClick={() => setFiltersOpen((v) => !v)}
                  >
                    <Filter className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:bg-white/6"
                    style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurfaceMuted }}
                    aria-label="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setHistoryOpen((open) => !open)}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em]"
                style={{
                  borderColor: TOKENS.outlineGhost,
                  color: TOKENS.onSurfaceMuted,
                  background: TOKENS.surfaceLow,
                }}
              >
                {historyOpen ? "Hide history" : "View history"}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    historyOpen && "rotate-180",
                  )}
                />
              </button>
            </div>
          </div>

        {historyOpen && (
            <div className="border-t px-5 py-5 sm:px-7" style={{ borderColor: TOKENS.outlineGhost }}>
          <div
            className={cn(
              "overflow-hidden transition-[max-height,opacity] duration-300",
              filtersOpen ? "max-h-[220px] opacity-100" : "max-h-0 opacity-0",
            )}
          >
            <div
              className="rounded-xl border p-4 sm:p-5"
              style={{
                background: TOKENS.surfaceLow,
                borderColor: TOKENS.outlineGhost,
                boxShadow: CARD_INSET,
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Calendar
                    className="h-4 w-4 shrink-0"
                    style={{ color: TOKENS.secondary }}
                    strokeWidth={2}
                  />
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    Filters
                  </p>
                </div>
                {(p.filterStartDate ||
                  p.filterEndDate ||
                  p.filterFundCategory ||
                  p.filterExpenseCategory ||
                  p.filterAccountId) && (
                  <button
                    type="button"
                    onClick={() => {
                      p.setFilterStartDate("")
                      p.setFilterEndDate("")
                      p.setFilterFundCategory("")
                      p.setFilterExpenseCategory("")
                      p.setFilterAccountId("")
                    }}
                    className="rounded-lg border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em]"
                    style={{
                      borderColor: TOKENS.outlineGhost,
                      color: TOKENS.onSurfaceMuted,
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    From
                  </label>
                  <DateInput
                    value={p.filterStartDate}
                    onChange={(e) => p.setFilterStartDate(e.target.value)}
                    className={cn(consoleField, "border-transparent")}
                    style={{
                      background: TOKENS.surfaceContainer,
                      borderColor: TOKENS.outlineGhost,
                      color: TOKENS.onSurface,
                    }}
                  />
                </div>
                <div>
                  <label
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    To
                  </label>
                  <DateInput
                    value={p.filterEndDate}
                    onChange={(e) => p.setFilterEndDate(e.target.value)}
                    className={cn(consoleField, "border-transparent")}
                    style={{
                      background: TOKENS.surfaceContainer,
                      borderColor: TOKENS.outlineGhost,
                      color: TOKENS.onSurface,
                    }}
                  />
                </div>
                <div>
                  <label
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    Fund pillar
                  </label>
                  <AppSelect
                    value={p.filterFundCategory}
                    onValueChange={p.setFilterFundCategory}
                    variant="console"
                    className={cn(consoleField, "mt-1 border-transparent")}
                    style={{
                      backgroundColor: TOKENS.surfaceContainer,
                      borderColor: TOKENS.outlineGhost,
                      color: TOKENS.onSurface,
                    }}
                    placeholder="All"
                    options={[
                      { value: "", label: "All" },
                      ...FUND_CATEGORIES.map((c) => ({
                        value: c.value,
                        label: c.label,
                      })),
                    ]}
                  />
                </div>
                <div>
                  <label
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    Expense type
                  </label>
                  <AppSelect
                    value={p.filterExpenseCategory}
                    onValueChange={p.setFilterExpenseCategory}
                    variant="console"
                    className={cn(consoleField, "mt-1 border-transparent")}
                    style={{
                      backgroundColor: TOKENS.surfaceContainer,
                      borderColor: TOKENS.outlineGhost,
                      color: TOKENS.onSurface,
                    }}
                    placeholder="All"
                    options={[
                      { value: "", label: "All" },
                      ...EXPENSE_CATEGORIES.map((c) => ({
                        value: c.value,
                        label: c.label,
                      })),
                    ]}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    Account
                  </label>
                  <AppSelect
                    value={p.filterAccountId}
                    onValueChange={p.setFilterAccountId}
                    variant="console"
                    className={cn(consoleField, "mt-1 border-transparent")}
                    style={{
                      backgroundColor: TOKENS.surfaceContainer,
                      borderColor: TOKENS.outlineGhost,
                      color: TOKENS.onSurface,
                    }}
                    placeholder="All accounts"
                    options={[
                      { value: "", label: "All accounts" },
                      ...p.accounts.map((a) => ({
                        value: a.id,
                        label: `${a.name} (${a.bankName})`,
                      })),
                    ]}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {p.loadingExpenses ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl border px-4 py-4"
                    style={{
                      background: TOKENS.surfaceLow,
                      borderColor: TOKENS.outlineGhost,
                      boxShadow: CARD_INSET,
                    }}
                  >
                    <div className="h-4 w-40 rounded bg-white/[0.08]" />
                    <div className="mt-3 h-3 w-56 rounded bg-white/[0.06]" />
                    <div className="mt-2 h-3 w-32 rounded bg-white/[0.06]" />
                  </div>
                ))}
              </div>
            ) : p.expenses.length === 0 ? (
              <div className="py-14 text-center">
                <TrendingDown
                  className="mx-auto h-12 w-12"
                  style={{ color: TOKENS.onSurfaceMuted }}
                  strokeWidth={1.25}
                />
                <p
                  className="mt-4 text-base font-semibold"
                  style={{ color: TOKENS.onSurface }}
                >
                  No rows in this range
                </p>
                <p
                  className="mt-2 text-sm"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Log an expense or adjust filters.
                </p>
              </div>
            ) : (
              p.expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex flex-col gap-3 rounded-xl border px-4 py-4 transition-colors hover:bg-white/4 sm:flex-row sm:items-center sm:justify-between"
                  style={{
                    background: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    boxShadow: CARD_INSET,
                  }}
                >
                  <div className="min-w-0">
                    <p
                      className="truncate text-sm font-semibold tracking-tight"
                      style={{ color: TOKENS.onSurface }}
                    >
                      {expense.description?.trim() || "Unlabeled transaction"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {expense.category && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                          style={{
                            background: `color-mix(in srgb, ${TOKENS.secondary} 16%, ${TOKENS.surfaceHigh})`,
                            color: TOKENS.secondary,
                            border: `1px solid ${TOKENS.outlineGhost}`,
                          }}
                        >
                          {fundLabel(expense.category)}
                        </span>
                      )}
                      {expense.expenseCategory && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                          style={{
                            background: `color-mix(in srgb, #f87171 18%, ${TOKENS.surfaceHigh})`,
                            color: "#f87171",
                            border: `1px solid ${TOKENS.outlineGhost}`,
                          }}
                        >
                          {expenseLabel(expense.expenseCategory)}
                        </span>
                      )}
                      {!expense.category && !expense.expenseCategory && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                          style={{
                            background: TOKENS.surfaceHigh,
                            color: TOKENS.onSurfaceMuted,
                            border: `1px solid ${TOKENS.outlineGhost}`,
                          }}
                        >
                          Unclassified
                        </span>
                      )}
                      <span
                        className="text-xs tabular-nums"
                        style={{ color: TOKENS.onSurfaceMuted }}
                      >
                        {p.formatDate(expense.date)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div className="text-left sm:text-right">
                      <MajorFigureCurrency
                        amount={expense.amount}
                        variant="loss"
                        className="text-base font-bold!"
                        decimalEm={0.45}
                      />
                      <p
                        className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                        style={{ color: TOKENS.onSurfaceMuted }}
                      >
                        {expense.account.name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => p.handleDelete(expense.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
                      style={{
                        color: ERROR_SOFT,
                      }}
                      onMouseEnter={(e) => {
                        ;(e.currentTarget.style.backgroundColor =
                          `color-mix(in srgb, ${ERROR_SOFT} 12%, transparent)`)
                      }}
                      onMouseLeave={(e) => {
                        ;(e.currentTarget.style.backgroundColor = "transparent")
                      }}
                      aria-label="Delete expense"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <ConsolePaginationBar
            page={p.expensesPage}
            pageSize={p.expensesLimit}
            total={p.expensesTotal}
            onPageChange={p.fetchExpenses}
          />
            </div>
          )}
      </section>

      <section
        className="rounded-xl border p-6 sm:p-7"
        style={{
          background: TOKENS.surfaceContainer,
          borderColor: TOKENS.outlineGhost,
          boxShadow: CARD_INSET,
        }}
      >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.28em]"
                style={{ color: TOKENS.primary }}
              >
                Liquidity buffer analysis
              </p>
              <div
                className="mt-3 max-w-3xl text-sm leading-snug"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Based on the current month outflow of{" "}
                <span style={{ color: TOKENS.onSurface }}>
                  {showSummarySkeleton ? (
                    <ScrambleCurrencyValue min={400} max={5400} className="font-medium!" />
                  ) : (
                    p.formatCurrency(monthTotal)
                  )}
                </span>
                , your current liquid reserves provide{" "}
                <span style={{ color: TOKENS.onSurface }}>
                  {runwayMonths === null ? "—" : `${runwayMonths.toFixed(1)} months`}
                </span>{" "}
                of operational runway without further capital injection.
              </div>
            </div>
            <div
              className="flex h-14 w-20 items-end justify-end gap-1 rounded-xl border p-3"
              style={{
                background: TOKENS.surfaceLow,
                borderColor: TOKENS.outlineGhost,
                boxShadow: CARD_INSET,
              }}
              aria-hidden="true"
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <span
                  key={i}
                  className="w-2 rounded-sm"
                  style={{
                    height: `${10 + i * 6}px`,
                    background:
                      i >= 4
                        ? TOKENS.primary
                        : `color-mix(in srgb, ${TOKENS.primary} 40%, ${TOKENS.surfaceHigh})`,
                    opacity: 0.9,
                  }}
                />
              ))}
            </div>
          </div>
      </section>

      <ConfirmDialog
        open={p.showDeleteConfirm}
        onOpenChange={(open) => !open && p.setShowDeleteConfirm(false)}
        title="Delete expense"
        description="This removes the expense and restores the amount to the account."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        theme="console"
        onConfirm={p.confirmDelete}
      />
      <ConfirmDialog
        open={p.showRecurringDeleteConfirm}
        onOpenChange={(open) =>
          !open && p.setShowRecurringDeleteConfirm(false)
        }
        title="Delete recurring template?"
        description="Past logged expenses stay unchanged."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        theme="console"
        onConfirm={p.confirmDeleteRecurring}
      />
    </>
  )
}
