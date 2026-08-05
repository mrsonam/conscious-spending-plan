"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
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
  INCOME_PAGE_WARN_SURFACE as WARN_SURFACE,
} from "@/lib/income-page-types"
import type { IncomeEntry } from "@/lib/income-page-types"
import { ConsolePaginationBar } from "@/components/wealth-console/console-pagination"
import { consoleFocus, consoleHeroFigureClass, consoleHeroFigureInnerClass } from "@/components/wealth-console/console-ui"
import { MomChip } from "@/components/wealth-console/mom-chip"
import { HeroSparkline } from "@/components/wealth-console/hero-sparkline"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import type { UseIncomePageResult } from "@/hooks/use-income-page"
import { IncomeBulkDialog } from "@/components/income/income-bulk-dialog"
import { IncomeSourceArchitecture } from "@/components/income/income-source-architecture"
import { groupEntriesByRecency } from "@/lib/ledger-groups"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { useCountUp } from "@/hooks/use-count-up"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import { FormErrorAlert } from "@/components/wealth-console/form-status-alert"
import {
  FormFieldError,
  formFieldAria,
} from "@/components/forms/form-field-error"
import {
  Building2,
  Calculator,
  ChevronDown,
  Download,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react"

const consoleField =
  "mt-1 w-full rounded-xl border px-3 py-2.5 text-sm tabular-nums transition-[box-shadow] focus:outline-none focus:ring-2 focus:ring-[#4edea3]/45 [color-scheme:dark]"

function allocationPct(part: number, whole: number) {
  if (!whole || whole <= 0) return 0
  return Math.round((part / whole) * 1000) / 10
}

const PILLAR_SEGMENTS = [
  {
    key: "fixed",
    label: "Fixed costs",
    color: "rgba(248,113,113,0.9)",
    border: "rgba(248,113,113,0.35)",
    bg: "rgba(248,113,113,0.08)",
    field: "allocationFixedCosts",
  },
  {
    key: "savings",
    label: "Savings",
    color: "rgba(74,222,128,0.92)",
    border: "rgba(74,222,128,0.35)",
    bg: "rgba(74,222,128,0.08)",
    field: "allocationSavings",
  },
  {
    key: "investment",
    label: "Investment",
    color: "rgba(137,206,255,0.95)",
    border: "rgba(137,206,255,0.35)",
    bg: "rgba(137,206,255,0.1)",
    field: "allocationInvestment",
  },
  {
    key: "guilt",
    label: "Guilt-free spending",
    color: "rgba(196,181,253,0.92)",
    border: "rgba(196,181,253,0.35)",
    bg: "rgba(196,181,253,0.1)",
    field: "allocationGuiltFreeSpending",
  },
] as const

/** Condensed allocation split shown inside an expanded ledger row. */
function EntryAllocationDetail({ entry }: { entry: IncomeEntry }) {
  if (entry.excludeFromAllocation) {
    return (
      <p className="text-sm leading-relaxed" style={{ color: TOKENS.onSurfaceMuted }}>
        Recorded without allocating to budget pillars.
      </p>
    )
  }

  const amounts = PILLAR_SEGMENTS.map((seg) => entry[seg.field] ?? null)
  if (amounts.some((a) => a === null)) {
    return (
      <p className="text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
        Allocation details unavailable for this entry.
      </p>
    )
  }

  const total = entry.amount

  return (
    <>
      <div
        className="flex h-2 w-full min-w-0 overflow-hidden rounded-full"
        style={{ background: TOKENS.surfaceHigh }}
        role="img"
        aria-label="Allocation split across categories"
      >
        {PILLAR_SEGMENTS.map((seg, i) => {
          const amount = amounts[i]!
          const w = total > 0 ? Math.max(0, (amount / total) * 100) : 0
          if (w <= 0) return null
          return (
            <div
              key={seg.key}
              className="min-w-[2px] shrink-0"
              style={{ width: `${w}%`, background: seg.color }}
            />
          )
        })}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PILLAR_SEGMENTS.map((seg, i) => (
          <div
            key={seg.key}
            className="rounded-lg border px-2.5 py-2"
            style={{ borderColor: seg.border, background: seg.bg }}
          >
            <p
              className="text-[9px] font-semibold uppercase tracking-wider"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              {seg.label}
            </p>
            <div className="mt-1 flex items-baseline justify-between gap-1">
              <MajorFigureCurrency
                amount={amounts[i]!}
                variant="neutral"
                className="text-sm font-bold!"
                decimalEm={0.5}
              />
              <span
                className="text-[10px] font-medium tabular-nums"
                style={{ color: TOKENS.tertiary }}
              >
                {allocationPct(amounts[i]!, total)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export function IncomePageBento(p: UseIncomePageResult) {
  const { formatCurrency } = useFormatCurrency()
  const [logOpen, setLogOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const reducedMotion = usePrefersReducedMotion()
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set())
  const [pendingAutoExpandTop, setPendingAutoExpandTop] = useState(false)
  const showMetricSkeleton =
    p.loadingSummary &&
    p.incomeStats.currentMonthTotal === 0 &&
    p.incomeStats.ytdTotal === 0
  const showSourceSkeleton = p.loadingSource && p.sourceEntries.length === 0

  useEffect(() => {
    void p.ensureHistoryLoaded()
  }, [p.ensureHistoryLoaded])

  useEffect(() => {
    if (!pendingAutoExpandTop) return
    const topEntry = p.incomeEntries[0]
    if (topEntry) setExpandedRowIds(new Set([topEntry.id]))
  }, [pendingAutoExpandTop, p.incomeEntries])

  const toggleRow = (id: string) => {
    setPendingAutoExpandTop(false)
    setExpandedRowIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const submitLog = async (e: React.FormEvent) => {
    const wasEditing = Boolean(p.editingEntryId)
    const ok = await p.handleSubmit(e)
    if (ok) {
      setLogOpen(false)
      if (!wasEditing) {
        setPendingAutoExpandTop(true)
        window.setTimeout(() => setPendingAutoExpandTop(false), 4000)
      }
    }
  }

  const openLogDialog = () => {
    p.resetLogForm()
    setLogOpen(true)
  }

  const openEditDialog = (entry: IncomeEntry) => {
    p.startEditEntry(entry)
    setLogOpen(true)
  }

  const handleLogOpenChange = (open: boolean) => {
    setLogOpen(open)
    if (!open) p.resetLogForm()
  }

  const isEditing = Boolean(p.editingEntryId)

  const openBulkImport = () => {
    if (p.loadingForm) return
    p.setShowBulkForm(true)
    p.setError("")
    if (p.accounts.length && !p.bulkAccountId) {
      p.setBulkAccountId(
        p.accounts.find((a) => a.isDefault)?.id || p.accounts[0]!.id,
      )
    }
  }

  const exportCsv = async () => {
    setExporting(true)
    try {
      const res = await fetch("/api/income-entries?forStatement=true")
      if (!res.ok) {
        toast.error("Export failed", {
          description: "Could not fetch income entries. Try again.",
        })
        return
      }
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
      toast.success("Export ready", {
        description: `${entries.length} income ${entries.length === 1 ? "entry" : "entries"} downloaded.`,
      })
    } catch (error) {
      console.error("Income CSV export failed:", error)
      toast.error("Export failed", {
        description: "Something went wrong building the CSV. Try again.",
      })
    } finally {
      setExporting(false)
    }
  }

  const perf = p.incomeStats.monthOverMonthPct
  const animatedRevenue = useCountUp(p.incomeStats.currentMonthTotal)
  const sparklineValues = p.incomeStats.monthlyTotals.map((t) => t.total)
  const selectedMonthLabel =
    p.monthOptions.find((o) => o.month === p.selectedMonth && o.year === p.selectedYear)?.label ??
    new Date(p.selectedYear, p.selectedMonth - 1).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    })

  return (
    <>
      {/* Row 1: hero metrics + command actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <section className="lg:col-span-8">
          <div className="px-1 py-2 sm:px-2">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.28em]"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Current monthly revenue · {selectedMonthLabel}
            </p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
              {showMetricSkeleton ? (
                <div className={consoleHeroFigureClass}>
                  <ScrambleCurrencyValue
                    variant="income"
                    min={1800}
                    max={12000}
                    className={consoleHeroFigureInnerClass}
                  />
                </div>
              ) : (
                <div className={consoleHeroFigureClass}>
                  <MajorFigureCurrency
                    amount={animatedRevenue}
                    variant="income"
                    decimalEm={0.5}
                    className={consoleHeroFigureInnerClass}
                  />
                </div>
              )}
              <MomChip pct={perf} />
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
                  <>
                    <p
                      className="mt-2 text-lg font-semibold tabular-nums"
                      style={{ color: TOKENS.onSurface }}
                    >
                      {formatCurrency(p.incomeStats.ytdTotal)}
                    </p>
                    <HeroSparkline
                      values={sparklineValues}
                      reducedMotion={reducedMotion}
                      formatValue={formatCurrency}
                      ariaLabel="Six-month income trend"
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        <section
          className="flex flex-col items-stretch gap-2.5 sm:items-end lg:col-span-4"
          aria-labelledby="income-command-heading"
        >
          <h2 id="income-command-heading" className="sr-only">
            Command actions
          </h2>
          <label htmlFor="income-summary-period" className="sr-only">
            Statement period
          </label>
          <AppSelect
            id="income-summary-period"
            value={`${p.selectedYear}-${p.selectedMonth}`}
            onValueChange={(v) => {
              const [y, m] = v.split("-").map(Number)
              p.setSelectedYear(y)
              p.setSelectedMonth(m)
            }}
            className="border-transparent"
            triggerClassName="h-10 w-40"
            style={{
              backgroundColor: TOKENS.surfaceLow,
              borderColor: TOKENS.outlineGhost,
              color: TOKENS.onSurface,
            }}
            options={p.monthOptions.map((opt) => ({ value: opt.value, label: opt.label }))}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={openBulkImport}
              disabled={p.loadingForm || !p.allocation || p.accounts.length === 0}
              className={cn(
                "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border px-3.5 text-xs font-bold uppercase tracking-[0.12em] transition-[background-color,transform] duration-150 hover:bg-white/6 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100",
                consoleFocus,
              )}
              style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurfaceMuted }}
            >
              <Upload className="h-3.5 w-3.5" strokeWidth={2.25} />
              {p.loadingForm ? "Waiting…" : "Bulk"}
            </button>
            <button
              type="button"
              onClick={openLogDialog}
              disabled={p.loadingForm || !p.allocation}
              className={cn(
                "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-bold uppercase tracking-[0.12em] transition-[opacity,transform] duration-150 hover:opacity-95 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100",
                consoleFocus,
              )}
              style={{ background: TOKENS.primary, color: TOKENS.surface }}
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              {p.loadingForm ? "Connecting…" : "Log income"}
            </button>
          </div>
        </section>
      </div>

      {/* Row 2: full-width source architecture */}
      <IncomeSourceArchitecture
        entries={p.sourceEntries}
        loading={showSourceSkeleton}
        referenceDate={new Date(p.selectedYear, p.selectedMonth - 1, 15)}
        className="mt-4 lg:mt-5"
      />

      <Dialog open={logOpen} onOpenChange={handleLogOpenChange}>
        <DialogContent
          className="relative max-h-[90vh] overflow-y-auto border p-0 shadow-2xl"
          style={{
            background: TOKENS.surfaceContainer,
            borderColor: TOKENS.outlineGhost,
            boxShadow:
              "0 24px 48px rgba(0,0,0,0.5), inset 0 1px 0 0 rgba(218,226,253,0.06)",
          }}
        >
          <DialogClose onClose={() => handleLogOpenChange(false)} />
          <div className="p-6 sm:p-8">
            <DialogHeader>
              <DialogTitle
                className="text-xl"
                style={{ color: TOKENS.onSurface }}
              >
                {isEditing ? "Edit income" : "Log income"}
              </DialogTitle>
              <DialogDescription
                className="text-sm leading-relaxed"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                {isEditing
                  ? "Update amount, account, date, or allocation. Budget envelopes and balances adjust automatically."
                  : "Enter amount and date. Optionally allocate to your conscious spending pillars."}
              </DialogDescription>
            </DialogHeader>
            <form noValidate onSubmit={submitLog} className="mt-6 space-y-5" inert={p.calculating}>
              <FormErrorAlert error={p.error || null} />

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
                  onChange={(e) => {
                    p.setIncome(e.target.value)
                    p.clearFieldError("income")
                  }}
                  min="0"
                  step="0.01"
                  disabled={p.calculating}
                  placeholder="0.00"
                  className={cn(consoleField, "border-transparent")}
                  style={{
                    background: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                  {...formFieldAria("income-modal", p.fieldErrors.income)}
                />
                <FormFieldError
                  controlId="income-modal"
                  message={p.fieldErrors.income}
                 
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
                  onChange={(e) => {
                    p.setDate(e.target.value)
                    p.clearFieldError("date")
                  }}
                  disabled={p.calculating}
                  className={cn(consoleField, "border-transparent")}
                  style={{
                    background: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                  aria-invalid={!!p.fieldErrors.date}
                  {...formFieldAria("date-modal", p.fieldErrors.date)}
                />
                <FormFieldError
                  controlId="date-modal"
                  message={p.fieldErrors.date}
                 
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
                          {account.isDefault ? ", Default" : ""}{" "}
                          {account.accountType === "cash" ? ", Cash" : ""}
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
                className={cn(
                  "flex w-full min-h-11 items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-opacity disabled:opacity-50",
                  consoleFocus,
                )}
                style={{
                  background: TOKENS.primary,
                  color: TOKENS.surface,
                }}
              >
                <Calculator className="h-4 w-4" strokeWidth={2} />
                {p.calculating
                  ? isEditing
                    ? "Saving…"
                    : "Logging…"
                  : isEditing
                    ? "Save changes"
                    : "Submit"}
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
            <button
              type="button"
              disabled={exporting || p.loadingHistory}
              onClick={exportCsv}
              className={cn(
                "inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-lg border transition-[background-color,transform] duration-150 hover:bg-white/6 active:scale-90 disabled:opacity-50 disabled:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100",
                consoleFocus,
              )}
              style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurfaceMuted }}
              aria-label="Download"
              title="Export CSV"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>

        {p.loadingHistory && p.incomeEntries.length === 0 ? (
            <div className="mt-6">
              <IncomeHistorySkeleton layout="rows" rowCount={5} />
            </div>
          ) : (
            <>
              <div className="mt-6 space-y-6">
                {groupEntriesByRecency(p.incomeEntries).map((group) => (
                  <div key={group.key}>
                    <p
                      className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em]"
                      style={{ color: TOKENS.onSurfaceMutedElevated }}
                    >
                      {group.label}
                    </p>
                    <div className="space-y-3">
                      {group.entries.map((entry) => {
                        const expanded = expandedRowIds.has(entry.id)
                        const contentId = `income-entry-${entry.id}`
                        return (
                          <div
                            key={entry.id}
                            className="rounded-xl border"
                            style={{
                              background: TOKENS.surfaceLow,
                              borderColor: TOKENS.outlineGhost,
                              boxShadow: CARD_INSET,
                            }}
                          >
                            <div className="flex items-center gap-2 px-2 py-2 sm:px-3">
                              <button
                                type="button"
                                onClick={() => toggleRow(entry.id)}
                                aria-expanded={expanded}
                                aria-controls={contentId}
                                className={cn(
                                  "flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-left transition-[background-color,transform] duration-150 hover:bg-white/4 active:scale-[0.995] motion-reduce:transition-none motion-reduce:active:scale-100",
                                  consoleFocus,
                                )}
                              >
                                <div className="min-w-0 flex-1">
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

                                <div className="shrink-0 text-right">
                                  <div
                                    className="inline-flex items-baseline gap-0.5 text-lg font-bold tabular-nums"
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

                                <ChevronDown
                                  className="h-4 w-4 shrink-0 transition-transform"
                                  style={{
                                    color: TOKENS.onSurfaceMuted,
                                    transform: expanded ? "rotate(180deg)" : "none",
                                  }}
                                  aria-hidden
                                />
                              </button>

                              <div className="flex shrink-0 items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditDialog(entry)}
                                  className={cn(
                                    "inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-lg transition-[background-color,transform] duration-150 hover:bg-white/[0.06] active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100",
                                    consoleFocus,
                                  )}
                                  style={{ color: TOKENS.onSurfaceMuted }}
                                  aria-label={`Edit income ${entry.description?.trim() || "entry"}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => p.setDeleteEntryId(entry.id)}
                                  className={cn(
                                    "inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-lg transition-[background-color,transform] duration-150 hover:bg-white/[0.06] active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100",
                                    consoleFocus,
                                  )}
                                  style={{ color: TOKENS.loss }}
                                  aria-label="Delete entry"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            <div
                              id={contentId}
                              aria-hidden={!expanded}
                              className="grid transition-[grid-template-rows] duration-200 ease-out"
                              style={{
                                gridTemplateRows: expanded ? "1fr" : "0fr",
                                transitionDuration: reducedMotion ? "0s" : undefined,
                              }}
                            >
                              <div className="overflow-hidden">
                                <div
                                  className="border-t px-4 py-4 sm:px-5"
                                  style={{ borderColor: TOKENS.outlineGhost }}
                                >
                                  <EntryAllocationDetail entry={entry} />
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
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
          )}

        <IncomeBulkDialog p={p} />

        <ConfirmDialog
          open={p.deleteEntryId !== null}
          onOpenChange={(open) => !open && p.setDeleteEntryId(null)}
          title="Delete income entry"
          description="Are you sure you want to delete this income entry? This cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
         
          onConfirm={p.handleDeleteEntry}
        />
      </section>
    </>
  )
}
