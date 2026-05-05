"use client"

import { useEffect, useState } from "react"
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
import {
  IncomeHistorySkeleton,
} from "@/components/skeletons/income-sections"
import { cn } from "@/lib/utils"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { ScrambleCurrencyValue } from "@/components/ui/scramble-number"
import {
  INCOME_PAGE_ERROR_SOFT as ERROR_SOFT,
  INCOME_PAGE_WARN_SURFACE as WARN_SURFACE,
} from "@/lib/income-page-types"
import type { IncomeBreakdown, IncomeEntry } from "@/lib/income-page-types"
import { ConsolePaginationBar } from "@/components/wealth-console/console-pagination"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import type { UseIncomePageResult } from "@/hooks/use-income-page"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import {
  Building2,
  Calculator,
  Download,
  ChevronDown,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react"

const consoleField =
  "mt-1 w-full rounded-xl border px-3 py-2.5 text-sm tabular-nums transition-[box-shadow] focus:outline-none focus:ring-2 focus:ring-[#4edea3]/45 [color-scheme:dark]"

function allocationPct(part: number, whole: number) {
  if (!whole || whole <= 0) return 0
  return Math.round((part / whole) * 1000) / 10
}

function isInCurrentMonth(isoDate: string) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  ).getTime()
  const t = new Date(isoDate).getTime()
  return !Number.isNaN(t) && t >= start && t <= end
}

function groupIncomeByLabel(entries: IncomeEntry[], limit: number) {
  const map = new Map<string, number>()
  for (const e of entries) {
    if (!isInCurrentMonth(e.date)) continue
    const label = (e.description?.trim() || e.account?.name || "Unlabeled").slice(
      0,
      48,
    )
    map.set(label, (map.get(label) || 0) + e.amount)
  }
  const rows = Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, amount]) => ({ label, amount }))
  const total = rows.reduce((s, r) => s + r.amount, 0)
  return { rows, total }
}

const PILLAR_SEGMENTS = [
  { key: "fixed", color: "rgba(248,113,113,0.9)" },
  { key: "savings", color: "rgba(74,222,128,0.92)" },
  { key: "investment", color: "rgba(137,206,255,0.95)" },
  { key: "guilt", color: "rgba(196,181,253,0.92)" },
] as const

function IncomeLoggedAllocationPanel({
  breakdown,
  onDismiss,
}: {
  breakdown: IncomeBreakdown
  onDismiss: () => void
}) {
  return (
    <section
      className="rounded-xl border p-5 sm:p-6"
      style={{
        background: TOKENS.surfaceLow,
        borderColor: TOKENS.outlineGhost,
        boxShadow: CARD_INSET,
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: TOKENS.primary }}
          >
            Income logged
          </p>
          <p
            className="mt-1 text-sm leading-snug"
            style={{ color: TOKENS.onSurfaceMuted }}
          >
            {breakdown.isExcludedFromAllocation
              ? "Recorded without allocating to budget pillars."
              : "How this entry is allocated across your fund categories."}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg p-2 transition-colors hover:bg-white/6"
          style={{ color: TOKENS.onSurfaceMuted }}
          aria-label="Dismiss allocation summary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {breakdown.depositedToAccountName && (
        <p className="mt-4 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
          Deposited to{" "}
          <span style={{ color: TOKENS.onSurface }}>
            {breakdown.depositedToAccountName}
          </span>
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-baseline gap-2">
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: TOKENS.onSurfaceMuted }}
        >
          Entry amount
        </span>
        <MajorFigureCurrency
          amount={breakdown.income}
          variant="prosperity"
          className="text-2xl font-bold!"
          decimalEm={0.45}
        />
      </div>

      {breakdown.isExcludedFromAllocation ? (
        <p className="mt-4 text-sm leading-relaxed" style={{ color: TOKENS.onSurfaceMuted }}>
          This amount was added to your account balance only. No pillar
          categories were funded from this entry.
        </p>
      ) : (
        <>
          <div
            className="mt-5 flex h-2.5 w-full min-w-0 overflow-hidden rounded-full"
            style={{ background: TOKENS.surfaceHigh }}
            role="img"
            aria-label="Allocation split across categories"
          >
            {[
              breakdown.fixedCosts,
              breakdown.savings,
              breakdown.investment,
              breakdown.guiltFreeSpending,
            ].map((amount, i) => {
              const w =
                breakdown.income > 0
                  ? Math.max(0, (amount / breakdown.income) * 100)
                  : 0
              if (w <= 0) return null
              return (
                <div
                  key={PILLAR_SEGMENTS[i].key}
                  className="min-w-[2px] shrink-0"
                  style={{
                    width: `${w}%`,
                    background: PILLAR_SEGMENTS[i].color,
                  }}
                />
              )
            })}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(
              [
                {
                  label: "Fixed costs",
                  amount: breakdown.fixedCosts,
                  border: "rgba(248,113,113,0.35)",
                  bg: "rgba(248,113,113,0.08)",
                },
                {
                  label: "Savings",
                  amount: breakdown.savings,
                  border: "rgba(74,222,128,0.35)",
                  bg: "rgba(74,222,128,0.08)",
                },
                {
                  label: "Investment",
                  amount: breakdown.investment,
                  border: "rgba(137,206,255,0.35)",
                  bg: "rgba(137,206,255,0.1)",
                },
                {
                  label: "Guilt-free spending",
                  amount: breakdown.guiltFreeSpending,
                  border: "rgba(196,181,253,0.35)",
                  bg: "rgba(196,181,253,0.1)",
                },
              ] as const
            ).map((row) => (
              <div
                key={row.label}
                className="rounded-xl border px-3 py-3"
                style={{
                  borderColor: row.border,
                  background: row.bg,
                  boxShadow: CARD_INSET,
                }}
              >
                <p
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  {row.label}
                </p>
                <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
                  <MajorFigureCurrency
                    amount={row.amount}
                    variant="neutral"
                    className="text-lg font-bold!"
                    decimalEm={0.45}
                  />
                  <span
                    className="tabular-nums text-xs font-medium"
                    style={{ color: TOKENS.tertiary }}
                  >
                    {allocationPct(row.amount, breakdown.income)}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div
            className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-4"
            style={{ borderColor: TOKENS.outlineGhost }}
          >
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Total allocated
            </span>
            <MajorFigureCurrency
              amount={breakdown.total}
              variant="prosperity"
              className="text-lg font-bold!"
              decimalEm={0.45}
            />
          </div>
        </>
      )}
    </section>
  )
}

export function IncomePageBento(p: UseIncomePageResult) {
  const { formatCurrency } = useFormatCurrency()
  const [logOpen, setLogOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const showMetricSkeleton =
    p.loadingSummary &&
    p.incomeStats.currentMonthTotal === 0 &&
    p.incomeStats.ytdTotal === 0
  const showSourceSkeleton = p.loadingSource && p.sourceEntries.length === 0

  useEffect(() => {
    if (historyOpen) {
      void p.ensureHistoryLoaded()
    }
  }, [historyOpen, p])

  const submitLog = async (e: React.FormEvent) => {
    const ok = await p.handleSubmit(e)
    if (ok) setLogOpen(false)
  }

  const exportCsv = async () => {
    setExporting(true)
    try {
      const res = await fetch("/api/income-entries?forStatement=true")
      if (!res.ok) return
      const data = (await res.json()) as { entries?: IncomeEntry[] }
      const entries = data.entries ?? []
      const header = [
        "Date",
        "Amount",
        "Description",
        "Account",
        "ExcludeFromAllocation",
      ]
      const lines = [
        header.join(","),
        ...entries.map((row) => {
          const ac = row.account
            ? `${row.account.bankName} ${row.account.name}`.replace(/,/g, " ")
            : ""
          return [
            row.date.slice(0, 10),
            row.amount,
            (row.description ?? "").replace(/,/g, " "),
            ac,
            row.excludeFromAllocation ? "yes" : "no",
          ].join(",")
        }),
      ]
      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `income-export-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const perf = p.incomeStats.monthOverMonthPct
  const perfPositive = perf !== null && perf >= 0
  const source = groupIncomeByLabel(p.sourceEntries, 3)
  const currentMonthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
  }).format(new Date())

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
          <section className="lg:col-span-8">
            <div className="px-1 py-2 sm:px-2">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.28em]"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Current monthly revenue
              </p>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                {showMetricSkeleton ? (
                  <div className="text-4xl font-black leading-none tracking-tight sm:text-5xl">
                    <ScrambleCurrencyValue
                      variant="income"
                      min={1800}
                      max={12000}
                      className="font-black!"
                    />
                  </div>
                ) : (
                  <div className="text-4xl font-black leading-none tracking-tight sm:text-5xl">
                    <MajorFigureCurrency
                      amount={p.incomeStats.currentMonthTotal}
                      variant="income"
                      decimalEm={0.5}
                      className="font-black!"
                    />
                  </div>
                )}
                <div
                  className="inline-flex items-center rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
                  style={{
                    background: `color-mix(in srgb, ${perf === null ? TOKENS.onSurfaceMuted : perfPositive ? TOKENS.primary : ERROR_SOFT} 18%, ${TOKENS.surfaceLow})`,
                    border: `1px solid ${TOKENS.outlineGhost}`,
                    color:
                      perf === null
                        ? TOKENS.onSurfaceMuted
                        : perfPositive
                          ? TOKENS.primary
                          : ERROR_SOFT,
                    boxShadow: CARD_INSET,
                  }}
                >
                  {perf !== null ? (
                    <>
                      {perfPositive ? (
                        <TrendingUp className="mr-2 h-4 w-4" strokeWidth={2} />
                      ) : (
                        <TrendingDown className="mr-2 h-4 w-4" strokeWidth={2} />
                      )}
                      {perfPositive ? "+" : ""}
                      {perf.toFixed(1)}% <span className="ml-1 opacity-75">vs prev. month</span>
                    </>
                  ) : (
                    <span>—</span>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <div>
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    YTD aggregate
                  </p>
                  {showMetricSkeleton ? (
                    <div className="mt-2 text-lg font-semibold tabular-nums">
                      <ScrambleCurrencyValue
                        min={5000}
                        max={75000}
                        className="font-semibold!"
                      />
                    </div>
                  ) : (
                    <p
                      className="mt-2 text-lg font-semibold tabular-nums"
                      style={{ color: TOKENS.onSurface }}
                    >
                      {formatCurrency(p.incomeStats.ytdTotal)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div
              className="mt-4 rounded-xl border p-6 sm:p-8"
              style={{
                background: TOKENS.surfaceContainer,
                borderColor: TOKENS.outlineGhost,
                boxShadow: CARD_INSET,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3
                    className="text-sm font-semibold"
                    style={{ color: TOKENS.onSurface }}
                  >
                    Source Architecture
                  </h3>
                  <p
                    className="mt-1 text-xs"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    {currentMonthLabel} distribution
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {showSourceSkeleton ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between gap-3">
                        <div
                          className="h-4 w-40 animate-pulse rounded-md"
                          style={{ background: TOKENS.surfaceLow }}
                        />
                        <div
                          className="h-4 w-10 animate-pulse rounded-md"
                          style={{ background: TOKENS.surfaceLow }}
                        />
                      </div>
                      <div className="mt-2 flex gap-1">
                        {Array.from({ length: 12 }).map((_, i) => (
                          <span
                            key={i}
                            className="h-2 w-3 rounded-[4px]"
                            style={{
                              background:
                                i < 6
                                  ? TOKENS.surfaceHigh
                                  : `color-mix(in srgb, ${TOKENS.onSurfaceMuted} 22%, ${TOKENS.surfaceLow})`,
                              opacity: i < 6 ? 1 : 0.55,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                ) : source.rows.length === 0 ? (
                  <p className="text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
                    No inflows logged this month.
                  </p>
                ) : (
                  source.rows.map((row, idx) => {
                    const pct =
                      source.total > 0
                        ? Math.round((row.amount / source.total) * 100)
                        : 0
                    const barColor =
                      idx === 0 ? TOKENS.primary : TOKENS.secondary
                    const filled = Math.round((pct / 100) * 12)
                    return (
                      <div key={row.label}>
                        <div className="flex items-center justify-between gap-3">
                          <p
                            className="truncate text-sm"
                            style={{ color: TOKENS.onSurface }}
                          >
                            {row.label}
                          </p>
                          <p
                            className="text-xs tabular-nums"
                            style={{ color: TOKENS.onSurfaceMuted }}
                          >
                            {pct}%
                          </p>
                        </div>
                        <div className="mt-2 flex gap-1">
                          {Array.from({ length: 12 }).map((_, i) => (
                            <span
                              key={i}
                              className="h-2 w-3 rounded-[4px]"
                              style={{
                                background:
                                  i < filled
                                    ? barColor
                                    : `color-mix(in srgb, ${TOKENS.onSurfaceMuted} 22%, ${TOKENS.surfaceLow})`,
                                opacity: i < filled ? 1 : 0.55,
                                boxShadow: i < filled ? CARD_INSET : undefined,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })
                )}
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
                  Instantiate a new income entry with contextual tags and
                  allocation rules.
              </p>

              <button
                type="button"
                onClick={() => setLogOpen(true)}
                disabled={p.loadingForm || !p.allocation}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-xs font-bold uppercase tracking-[0.2em] transition-opacity hover:opacity-95"
                style={{
                  background: TOKENS.primary,
                  color: TOKENS.surface,
                  boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
                }}
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                Log new income
              </button>

            </div>
          </section>
      </div>

      {p.breakdown && (
        <IncomeLoggedAllocationPanel
          breakdown={p.breakdown}
          onDismiss={p.clearBreakdown}
        />
      )}

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
                Log income
              </DialogTitle>
              <DialogDescription
                className="text-sm leading-relaxed"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Enter amount and date. Optionally allocate to your conscious
                spending pillars.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={submitLog} className="mt-6 space-y-5" inert={p.calculating}>
              {p.error && (
                <div
                  className="rounded-xl border px-4 py-3 text-sm"
                  style={{
                    background: `color-mix(in srgb, ${ERROR_SOFT} 12%, ${TOKENS.surfaceLow})`,
                    borderColor: `color-mix(in srgb, ${ERROR_SOFT} 35%, transparent)`,
                    color: ERROR_SOFT,
                  }}
                >
                  {p.error}
                </div>
              )}

              <div>
                <label
                  htmlFor="income-modal"
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Income ($)
                </label>
                <Input
                  id="income-modal"
                  type="number"
                  value={p.income}
                  onChange={(e) => p.setIncome(e.target.value)}
                  min="0"
                  step="0.01"
                  required
                  disabled={p.calculating}
                  placeholder="0.00"
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
                  htmlFor="description-modal"
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Description (optional)
                </label>
                <Input
                  id="description-modal"
                  type="text"
                  value={p.description}
                  onChange={(e) => p.setDescription(e.target.value)}
                  placeholder="Salary, freelance, etc."
                  disabled={p.calculating}
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
                  htmlFor="date-modal"
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Income date *
                </label>
                <DateInput
                  id="date-modal"
                  value={p.date}
                  onChange={(e) => p.setDate(e.target.value)}
                  required
                  disabled={p.calculating}
                  className={cn(consoleField, "border-transparent")}
                  style={{
                    background: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                />
              </div>

              {p.accounts.length > 0 && (
                <div>
                  <label
                    htmlFor="account-modal"
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    Deposit to account
                  </label>
                  <AppSelect
                    id="account-modal"
                    value={p.selectedAccountId}
                    onValueChange={p.setSelectedAccountId}
                    disabled={p.calculating}
                    variant="console"
                    className={cn(consoleField, "mt-1 border-transparent")}
                    style={{
                      backgroundColor: TOKENS.surfaceLow,
                      borderColor: TOKENS.outlineGhost,
                      color: TOKENS.onSurface,
                    }}
                    options={p.accounts.map((account) => ({
                      value: account.id,
                      label: (
                        <>
                          {account.name} ({account.bankName})
                          {account.isDefault ? " — Default" : ""}{" "}
                          {account.accountType === "cash" ? " — Cash" : ""}
                        </>
                      ),
                    }))}
                  />
                  {p.accounts.find((acc) => acc.id === p.selectedAccountId)
                    ?.accountType === "cash" && (
                    <div
                      className="mt-2 rounded-lg border px-3 py-2 text-xs leading-snug"
                      style={{
                        background: `color-mix(in srgb, ${WARN_SURFACE} 10%, ${TOKENS.surfaceLow})`,
                        borderColor: `color-mix(in srgb, ${WARN_SURFACE} 35%, transparent)`,
                        color: WARN_SURFACE,
                      }}
                    >
                      <strong className="font-semibold">Cash account:</strong>{" "}
                      You can exclude this inflow from allocation below.
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="flex cursor-pointer items-start gap-3 text-sm leading-snug">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border"
                    style={{
                      borderColor: TOKENS.outlineGhost,
                      background: TOKENS.surfaceLow,
                      accentColor: TOKENS.primary,
                    }}
                    checked={p.allocateToBudget}
                    disabled={p.calculating}
                    onChange={(e) => p.setAllocateToBudget(e.target.checked)}
                  />
                  <span style={{ color: TOKENS.onSurface }}>
                    Allocate to budget categories
                  </span>
                </label>
              </div>

              {p.accounts.length === 0 && (
                <div
                  className="rounded-xl border px-4 py-3 text-sm"
                  style={{
                    background: `color-mix(in srgb, ${WARN_SURFACE} 10%, ${TOKENS.surfaceLow})`,
                    borderColor: `color-mix(in srgb, ${WARN_SURFACE} 35%, transparent)`,
                    color: WARN_SURFACE,
                  }}
                >
                  No accounts found. Add an account first.
                </div>
              )}

              <button
                type="submit"
                disabled={p.calculating || !p.allocation}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-opacity disabled:opacity-50"
                style={{
                  background: TOKENS.primary,
                  color: TOKENS.surface,
                }}
              >
                <Calculator className="h-4 w-4" strokeWidth={2} />
                {p.calculating ? "Logging…" : "Submit"}
              </button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <section
        className="rounded-xl border p-5 sm:p-8"
        style={{
          background: TOKENS.surfaceContainer,
          borderColor: TOKENS.outlineGhost,
          boxShadow: CARD_INSET,
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3
              className="text-lg font-semibold tracking-tight"
              style={{ color: TOKENS.onSurface }}
            >
              Income Ledger
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {historyOpen ? (
              <button
                type="button"
                disabled={exporting || p.loadingHistory}
                onClick={exportCsv}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:bg-white/6 disabled:opacity-50"
                style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurfaceMuted }}
                aria-label="Download"
                title="Export CSV"
              >
                <Download className="h-4 w-4" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setHistoryOpen((current) => !current)}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em]"
              style={{
                borderColor: TOKENS.outlineGhost,
                color: TOKENS.onSurfaceMuted,
                background: TOKENS.surfaceContainer,
              }}
            >
              {historyOpen ? "Hide history" : "View history"}
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  historyOpen && "rotate-180",
                )}
              />
            </button>
          </div>
        </div>

        {historyOpen ? (
          p.loadingHistory && p.incomeEntries.length === 0 ? (
            <div className="mt-6">
              <IncomeHistorySkeleton variant="console" />
            </div>
          ) : (
            <>
              <div className="mt-6 space-y-3">
                {p.incomeEntries.map((entry) => (
                <div
                  key={entry.id}
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
                      {entry.description?.trim() || "Unlabeled inflow"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {entry.account && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                          style={{
                            background: `color-mix(in srgb, ${TOKENS.primary} 14%, ${TOKENS.surfaceHigh})`,
                            color: TOKENS.primary,
                            border: `1px solid ${TOKENS.outlineGhost}`,
                          }}
                        >
                          {entry.account.name}
                        </span>
                      )}
                      {entry.excludeFromAllocation && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                          style={{
                            background: TOKENS.surfaceHigh,
                            color: TOKENS.onSurfaceMuted,
                            border: `1px solid ${TOKENS.outlineGhost}`,
                          }}
                        >
                          Non-allocated
                        </span>
                      )}
                      <span
                        className="text-xs tabular-nums"
                        style={{ color: TOKENS.onSurfaceMuted }}
                      >
                        {p.formatDate(entry.date)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div className="text-left sm:text-right">
                      <div
                        className="inline-flex items-baseline justify-start gap-0.5 text-lg font-bold tabular-nums sm:justify-end"
                        style={{ color: TOKENS.primary }}
                      >
                        <span>+</span>
                        <MajorFigureCurrency
                          amount={entry.amount}
                          variant="prosperity"
                          className="text-lg font-bold!"
                          decimalEm={0.5}
                        />
                      </div>
                      <p
                        className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                        style={{ color: TOKENS.onSurfaceMuted }}
                      >
                        {entry.account?.bankName ?? "No account"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => p.setDeleteEntryId(entry.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
                      style={{ color: ERROR_SOFT }}
                      onMouseEnter={(e) => {
                        ;(e.currentTarget.style.backgroundColor =
                          `color-mix(in srgb, ${ERROR_SOFT} 12%, transparent)`)
                      }}
                      onMouseLeave={(e) => {
                        ;(e.currentTarget.style.backgroundColor = "transparent")
                      }}
                      aria-label="Delete entry"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                ))}
              </div>

              {p.incomeEntries.length === 0 && (
                <div className="py-14 text-center">
                  <Building2
                    className="mx-auto h-12 w-12"
                    style={{ color: TOKENS.onSurfaceMuted }}
                    strokeWidth={1.25}
                  />
                  <p
                    className="mt-4 text-base font-semibold"
                    style={{ color: TOKENS.onSurface }}
                  >
                    No ledger rows yet
                  </p>
                  <p className="mt-2 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
                    Use Log new income to record your first inflow.
                  </p>
                </div>
              )}

              <ConsolePaginationBar
                page={p.incomePage}
                pageSize={p.incomeLimit}
                total={p.incomeTotal}
                onPageChange={p.fetchIncomeEntries}
              />
            </>
          )
        ) : null}

        <ConfirmDialog
          open={p.deleteEntryId !== null}
          onOpenChange={(open) => !open && p.setDeleteEntryId(null)}
          title="Delete income entry"
          description="Are you sure you want to delete this income entry? This cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
          theme="console"
          onConfirm={p.handleDeleteEntry}
        />
      </section>
    </>
  )
}
