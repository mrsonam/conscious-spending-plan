"use client"

import { useMemo, useState } from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { AppSelect } from "@/components/ui/app-select"
import { ConsolePaginationBar } from "@/components/wealth-console/console-pagination"
import { CARD_INSET, CONSOLE_TABLE_PAGE_SIZE, TOKENS } from "@/lib/wealth-console-tokens"
import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "@/lib/income-page-types"
import {
  CategoryTrackingBarProgress,
  CategoryTrackingSegmentedBlocks,
  categoryTrackingConsoleField,
} from "@/components/category-tracking/category-tracking-console-ui"
import {
  consoleHeroFigureClass,
  consoleHeroFigureInnerClass,
} from "@/components/wealth-console/console-ui"
import { expenseLabel } from "@/components/expenses/expense-shared"
import { trackingFundShort, netPillarHeadroom } from "@/lib/category-tracking-shared"
import type { UseCategoryDetailPageResult } from "@/hooks/use-category-detail-page"

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function DeltaBadge({
  value,
  formatCurrency,
  invert = false,
}: {
  value: number
  formatCurrency: (n: number) => string
  invert?: boolean
}) {
  if (Math.abs(value) < 0.01) {
    return (
      <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TOKENS.onSurfaceMuted }}>
        No change
      </span>
    )
  }
  const positive = invert ? value < 0 : value > 0
  const color = positive ? TOKENS.primary : ERROR_SOFT
  return (
    <span className="text-[10px] font-bold tabular-nums" style={{ color }}>
      {value > 0 ? "+" : ""}
      {formatCurrency(value)}
    </span>
  )
}

function CompareCard({
  label,
  current,
  previous,
  formatCurrency,
  invertDelta = false,
}: {
  label: string
  current: number
  previous: number
  formatCurrency: (n: number) => string
  invertDelta?: boolean
}) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        background: TOKENS.surfaceLow,
        borderColor: TOKENS.outlineGhost,
        boxShadow: CARD_INSET,
      }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
        {label}
      </p>
      <p className="mt-2 text-lg font-bold tabular-nums" style={{ color: TOKENS.onSurface }}>
        {formatCurrency(current)}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
        <span>vs {formatCurrency(previous)}</span>
        <DeltaBadge value={current - previous} formatCurrency={formatCurrency} invert={invertDelta} />
      </div>
    </div>
  )
}

export function CategoryDetailView({
  category,
  p,
}: {
  category: string
  p: UseCategoryDetailPageResult
}) {
  const [page, setPage] = useState(1)

  const {
    meta,
    loading,
    selectedMonth,
    selectedYear,
    setSelectedMonth,
    setSelectedYear,
    monthOptions,
    selectedMonthLabel,
    previousMonthLabel,
    currentRow,
    previousRow,
    savingsGeneralAvailable,
    savingsAssignedToGoals,
    flow,
    history,
    transactions,
    formatCurrency,
    elapsed,
    deployed,
    displayAmount,
    usagePercent,
    spendDelta,
  } = p

  const accent = meta?.colorHex ?? TOKENS.secondary
  const Icon = meta?.Icon
  const isOverspent = (currentRow?.overspent ?? 0) > 0
  const isInvestment = category === "investment"
  const isSavings = category === "savings"
  const deployedLabel = isInvestment ? "Transferred" : "Spent"

  const pagedTransactions = useMemo(() => {
    const start = (page - 1) * CONSOLE_TABLE_PAGE_SIZE
    return transactions.slice(start, start + CONSOLE_TABLE_PAGE_SIZE)
  }, [page, transactions])

  let paceLabel = "—"
  if (elapsed <= 0) paceLabel = "Future"
  else if (elapsed >= 1) paceLabel = "Closed"
  else {
    const paceRatio = usagePercent / (elapsed * 100)
    if (paceRatio > 1.15) paceLabel = "Hot"
    else if (paceRatio < 0.85) paceLabel = "Cool"
    else paceLabel = "Balanced"
  }

  return (
    <>
        {loading && !currentRow ? (
          <div className="space-y-4" aria-busy="true" aria-label="Loading category">
            <section className="px-1 py-2 sm:px-2">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                <div className="h-8 w-48 max-w-full animate-pulse rounded" style={{ background: TOKENS.surfaceHigh }} />
                <div
                  className="h-8 w-28 animate-pulse rounded-lg border"
                  style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceHigh }}
                />
              </div>
              <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <div className="h-4 w-32 animate-pulse rounded" style={{ background: TOKENS.surfaceHigh }} />
                  <div className="mt-6 h-3 w-24 animate-pulse rounded" style={{ background: TOKENS.surfaceHigh }} />
                  <div className="mt-3 h-12 w-40 max-w-full animate-pulse rounded" style={{ background: TOKENS.surfaceHigh }} />
                </div>
                <div className="h-11 w-36 animate-pulse rounded-xl" style={{ background: TOKENS.surfaceHigh }} />
              </div>
            </section>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl border"
                style={{ background: TOKENS.surfaceContainer, borderColor: TOKENS.outlineGhost }}
              />
            ))}
          </div>
        ) : !meta || !currentRow ? (
          <p className="text-sm" style={{ color: TOKENS.loss }}>
            Could not load category data.
          </p>
        ) : (
          <>
            {/* Hero */}
            <section className="px-1 py-2 sm:px-2" aria-labelledby="category-detail-hero-heading">
              <h1 id="category-detail-hero-heading" className="sr-only">
                {meta.label}
              </h1>

              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                <h2
                  className="text-2xl font-black tracking-tight sm:text-3xl"
                  style={{ color: TOKENS.onSurface }}
                >
                  {meta.label}
                </h2>
                <div
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.16em]"
                  style={{
                    borderColor: TOKENS.outlineGhost,
                    color: accent,
                    background: TOKENS.surfaceHigh,
                  }}
                >
                  {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
                  Fund pillar
                </div>
              </div>

              <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <p className="text-sm leading-relaxed" style={{ color: TOKENS.onSurfaceMuted }}>
                    {selectedMonthLabel}
                  </p>
                  <p
                    className="mt-6 text-[10px] font-semibold uppercase tracking-[0.24em]"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    {isSavings ? "Spendable" : isOverspent ? "Breach" : "Residual"}
                  </p>
                  <div className={cn("mt-2", consoleHeroFigureClass)}>
                    <MajorFigureCurrency
                      amount={displayAmount}
                      variant={isOverspent ? "loss" : "prosperity"}
                      className={consoleHeroFigureInnerClass}
                      decimalEm={0.45}
                    />
                  </div>
                  {isOverspent ? (
                    <p className="mt-2 text-xs" style={{ color: ERROR_SOFT }}>
                      Overspent by {formatCurrency(currentRow.overspent)}
                    </p>
                  ) : null}
                </div>

                <div className="w-full max-w-xs lg:w-auto">
                  <label
                    id="category-detail-period-label"
                    className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    Period
                  </label>
                  <AppSelect
                    aria-labelledby="category-detail-period-label"
                    value={`${selectedYear}-${selectedMonth}`}
                    onValueChange={(v) => {
                      const [y, m] = v.split("-").map(Number)
                      setSelectedYear(y)
                      setSelectedMonth(m)
                      setPage(1)
                    }}
                    className={cn(categoryTrackingConsoleField, "mt-2 border-transparent")}
                    style={{
                      backgroundColor: TOKENS.surfaceHigh,
                      borderColor: TOKENS.outlineGhost,
                      color: TOKENS.onSurface,
                    }}
                    options={monthOptions.map((opt) => ({ value: opt.value, label: opt.label }))}
                  />
                </div>
              </div>
            </section>

            {/* vs previous month */}
            <section>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.28em]" style={{ color: TOKENS.onSurfaceMuted }}>
                vs {previousMonthLabel}
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <CompareCard
                  label="Envelope"
                  current={currentRow.allocated}
                  previous={previousRow?.allocated ?? 0}
                  formatCurrency={formatCurrency}
                />
                <CompareCard
                  label={deployedLabel}
                  current={deployed}
                  previous={p.prevDeployed}
                  formatCurrency={formatCurrency}
                  invertDelta
                />
                <CompareCard
                  label="Remaining"
                  current={displayAmount}
                  previous={previousRow ? netPillarHeadroom(previousRow) : 0}
                  formatCurrency={formatCurrency}
                />
              </div>
              {Math.abs(spendDelta) >= 0.01 && (
                <p className="mt-3 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
                  {deployedLabel} is{" "}
                  <span style={{ color: spendDelta > 0 ? ERROR_SOFT : TOKENS.primary }}>
                    {spendDelta > 0 ? "up" : "down"} {formatCurrency(Math.abs(spendDelta))}
                  </span>{" "}
                  compared to last month.
                </p>
              )}
            </section>

            {/* Current month breakdown */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div
                className="rounded-xl border p-5"
                style={{
                  background: TOKENS.surfaceContainer,
                  borderColor: isOverspent ? ERROR_SOFT : TOKENS.outlineGhost,
                  boxShadow: CARD_INSET,
                }}
              >
                <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
                  {selectedMonthLabel} breakdown
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: TOKENS.onSurfaceMuted }}>Envelope</span>
                    <span className="tabular-nums font-medium">{formatCurrency(currentRow.allocated)}</span>
                  </div>
                  {isSavings && (
                    <>
                      <div className="flex justify-between">
                        <span style={{ color: TOKENS.onSurfaceMuted }}>Total in savings</span>
                        <span className="tabular-nums font-medium">
                          {formatCurrency(savingsGeneralAvailable + savingsAssignedToGoals)}
                        </span>
                      </div>
                      {savingsAssignedToGoals > 0 && (
                        <div className="flex justify-between">
                          <span style={{ color: TOKENS.onSurfaceMuted }}>In saving goals</span>
                          <span className="tabular-nums" style={{ color: TOKENS.secondary }}>
                            −{formatCurrency(savingsAssignedToGoals)}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between">
                    <span style={{ color: TOKENS.onSurfaceMuted }}>{deployedLabel}</span>
                    <span className="tabular-nums font-medium" style={{ color: ERROR_SOFT }}>
                      {formatCurrency(deployed)}
                    </span>
                  </div>
                  {(currentRow.carryover > 0 ||
                    currentRow.overspending > 0 ||
                    flow.in > 0 ||
                    flow.out > 0) && (
                    <div className="border-t pt-2 space-y-2" style={{ borderColor: TOKENS.outlineGhost }}>
                      {currentRow.carryover > 0 && (
                        <div className="flex justify-between" style={{ color: TOKENS.primary }}>
                          <span>Carryover</span>
                          <span>+{formatCurrency(currentRow.carryover)}</span>
                        </div>
                      )}
                      {flow.in > 0 && (
                        <div className="flex justify-between" style={{ color: TOKENS.secondary }}>
                          <span>Moved in</span>
                          <span>+{formatCurrency(flow.in)}</span>
                        </div>
                      )}
                      {flow.out > 0 && (
                        <div className="flex justify-between">
                          <span>Moved out</span>
                          <span>−{formatCurrency(flow.out)}</span>
                        </div>
                      )}
                      {currentRow.overspending > 0 && (
                        <div className="flex justify-between" style={{ color: ERROR_SOFT }}>
                          <span>Prior clawback</span>
                          <span>−{formatCurrency(currentRow.overspending)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <p className="mt-4 text-[10px]" style={{ color: TOKENS.onSurfaceMuted }}>
                  Pace · <span style={{ color: TOKENS.onSurface }}>{paceLabel}</span>
                  {elapsed > 0 && elapsed < 1 && (
                    <span> · {(elapsed * 100).toFixed(0)}% of month</span>
                  )}
                </p>
                <CategoryTrackingSegmentedBlocks
                  percent={Math.min(100, usagePercent)}
                  activeColor={isOverspent ? ERROR_SOFT : accent}
                  label={`${meta.label} usage ${usagePercent.toFixed(0)} percent`}
                />
              </div>

              {/* 6-month trend */}
              <div
                className="rounded-xl border p-5"
                style={{
                  background: TOKENS.surfaceContainer,
                  borderColor: TOKENS.outlineGhost,
                  boxShadow: CARD_INSET,
                }}
              >
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: TOKENS.onSurfaceMuted }}>
                  Last 6 months
                </p>
                <p className="mb-3 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
                  Ending {selectedMonthLabel} · envelope vs {deployedLabel.toLowerCase()}
                </p>
                {history.length === 0 ? (
                  <p className="text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
                    No history yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {history.map((row) => {
                      const isSelected =
                        row.monthNum === selectedMonth && row.year === selectedYear
                      const pct =
                        row.allocated > 0
                          ? Math.min(100, (row.spent / row.allocated) * 100)
                          : 0
                      return (
                        <div
                          key={`${row.year}-${row.monthNum}`}
                          className="rounded-lg px-2 py-1"
                          style={
                            isSelected
                              ? {
                                  background: `color-mix(in srgb, ${accent} 10%, transparent)`,
                                }
                              : undefined
                          }
                        >
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span
                              className="font-medium"
                              style={{ color: isSelected ? accent : TOKENS.onSurface }}
                            >
                              {row.month}
                              {isSelected ? " · selected" : ""}
                            </span>
                            <span className="tabular-nums text-right" style={{ color: TOKENS.onSurfaceMuted }}>
                              {formatCurrency(row.spent)} / {formatCurrency(row.allocated)}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center justify-between text-[10px] tabular-nums" style={{ color: TOKENS.onSurfaceMuted }}>
                            <span>
                              {row.overspent > 0
                                ? `Over by ${formatCurrency(row.overspent)}`
                                : `${formatCurrency(row.remaining)} left`}
                            </span>
                            <span>{pct.toFixed(0)}%</span>
                          </div>
                          <CategoryTrackingBarProgress
                            percent={pct}
                            color={row.overspent > 0 ? ERROR_SOFT : accent}
                            label={`${row.month} ${deployedLabel.toLowerCase()}`}
                          />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Transactions */}
            <section
              className="rounded-xl border"
              style={{
                background: TOKENS.surfaceContainer,
                borderColor: TOKENS.outlineGhost,
                boxShadow: CARD_INSET,
              }}
            >
              <div className="px-5 py-4 sm:px-7">
                <h2 className="text-base font-semibold tracking-tight" style={{ color: TOKENS.onSurface }}>
                  Transactions
                </h2>
                <p className="mt-1 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
                  {loading
                    ? "Loading…"
                    : transactions.length === 0
                      ? `No ${deployedLabel.toLowerCase()} recorded this month`
                      : `${transactions.length} transaction${transactions.length === 1 ? "" : "s"} in ${selectedMonthLabel}`}
                </p>
              </div>
              <div className="border-t px-5 py-5 sm:px-7" style={{ borderColor: TOKENS.outlineGhost }}>
                {transactions.length === 0 ? (
                  <p className="py-8 text-center text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
                    Nothing to show for this period.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {pagedTransactions.map((t) => {
                      const title =
                        t.description?.trim() ||
                        (t.type === "bucket_transfer"
                          ? "Bucket transfer"
                          : t.type === "transfer"
                            ? isInvestment
                              ? "Investment transfer"
                              : "Account transfer"
                            : "Expense")
                      const typeLabel =
                        t.type === "bucket_transfer"
                          ? "Bucket move"
                          : t.type === "transfer"
                            ? "Transfer"
                            : "Expense"

                      return (
                        <div
                          key={`${t.type}:${t.id}`}
                          className="flex flex-col gap-3 rounded-xl border px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                          style={{
                            background: TOKENS.surfaceLow,
                            borderColor: TOKENS.outlineGhost,
                            boxShadow: CARD_INSET,
                          }}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
                              {title}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <span
                                className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                                style={{
                                  background: TOKENS.surfaceHigh,
                                  color: TOKENS.onSurfaceMuted,
                                  border: `1px solid ${TOKENS.outlineGhost}`,
                                }}
                              >
                                {typeLabel}
                              </span>
                              {t.expenseCategory ? (
                                <span
                                  className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                                  style={{
                                    background: `color-mix(in srgb, ${ERROR_SOFT} 18%, ${TOKENS.surfaceHigh})`,
                                    color: ERROR_SOFT,
                                    border: `1px solid ${TOKENS.outlineGhost}`,
                                  }}
                                >
                                  {expenseLabel(t.expenseCategory)}
                                </span>
                              ) : null}
                              {t.type === "bucket_transfer" && t.fromCategory && t.toCategory ? (
                                <span className="text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
                                  {trackingFundShort(t.fromCategory)}
                                  <ChevronRight className="mx-0.5 inline h-3 w-3" />
                                  {trackingFundShort(t.toCategory)}
                                </span>
                              ) : null}
                              {t.accountLabel ? (
                                <span className="text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
                                  {t.accountLabel}
                                </span>
                              ) : null}
                              <span className="text-xs tabular-nums" style={{ color: TOKENS.onSurfaceMuted }}>
                                {formatDateShort(t.date)}
                              </span>
                            </div>
                          </div>
                          <MajorFigureCurrency
                            amount={t.amount}
                            variant="loss"
                            className="text-base font-bold!"
                            decimalEm={0.45}
                          />
                        </div>
                      )
                    })}
                  </div>
                )}
                {transactions.length > CONSOLE_TABLE_PAGE_SIZE && (
                  <ConsolePaginationBar
                    page={page}
                    pageSize={CONSOLE_TABLE_PAGE_SIZE}
                    total={transactions.length}
                    onPageChange={setPage}
                  />
                )}
              </div>
            </section>
          </>
        )}
    </>
  )
}
