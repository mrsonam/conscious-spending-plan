"use client"

import { useState } from "react"
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
import {
  IncomeFormSkeleton,
  IncomeHistorySkeleton,
} from "@/components/skeletons/income-sections"
import { cn } from "@/lib/utils"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "@/lib/income-page-types"
import {
  EXPENSE_CATEGORIES,
  FUND_CATEGORIES,
  FREQUENCIES,
} from "@/lib/expense-page-constants"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import type { UseExpensePageResult } from "@/hooks/use-expense-page"
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Play,
  Plus,
  TrendingDown,
  TrendingUp,
  Trash2,
} from "lucide-react"

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

      {p.loadingAccounts ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
          <div className="lg:col-span-7">
            <IncomeFormSkeleton variant="console" />
          </div>
          <div className="lg:col-span-5">
            <IncomeHistorySkeleton variant="console" />
          </div>
        </div>
      ) : (
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
                <MajorFigureCurrency
                  amount={p.expenseStats.currentMonthTotal}
                  variant="loss"
                  className="font-black!"
                />
              </div>

              <div className="mt-4">
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  YTD aggregate
                </p>
                <p
                  className="mt-2 text-lg font-semibold tabular-nums"
                  style={{ color: TOKENS.onSurface }}
                >
                  {p.formatCurrency(p.expenseStats.ytdTotal)}
                </p>
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
                  <p
                    className="text-lg font-bold tabular-nums"
                    style={{ color: TOKENS.onSurface }}
                  >
                    {Number.isFinite(fixedPct) ? fixedPct.toFixed(0) : "0"}%
                  </p>
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
                  <p
                    className="text-lg font-bold tabular-nums"
                    style={{ color: TOKENS.onSurface }}
                  >
                    {Number.isFinite(investPct) ? investPct.toFixed(0) : "0"}%
                  </p>
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
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-xs font-bold uppercase tracking-[0.2em] transition-opacity hover:opacity-95"
                style={{
                  background: TOKENS.primary,
                  color: TOKENS.surface,
                  boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
                }}
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                Log new expense
              </button>

              <button
                type="button"
                onClick={() => {
                  p.setShowBulkForm(true)
                  p.setMessage(null)
                  if (p.accounts.length && !p.bulkAccountId) {
                    p.setBulkAccountId(
                      p.accounts.find((a) => a.isDefault)?.id || p.accounts[0].id,
                    )
                  }
                }}
                className="mt-3 w-full rounded-xl border py-3 text-center text-[10px] font-bold uppercase tracking-[0.18em] transition-opacity hover:opacity-90"
                style={{
                  borderColor: TOKENS.outlineGhost,
                  color: TOKENS.onSurfaceMuted,
                }}
              >
                Bulk import
              </button>
            </div>
          </section>
        </div>
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
            <form onSubmit={submitLog} className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="exp-account"
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Account *
                </label>
                <select
                  id="exp-account"
                  value={p.accountId}
                  onChange={(e) => {
                    p.setAccountId(e.target.value)
                    const a = p.accounts.find((acc) => acc.id === e.target.value)
                    if (a?.accountType === "cash") p.setFundCategory("")
                  }}
                  required
                  className={cn(consoleField, "cursor-pointer appearance-none pr-10")}
                  style={{
                    backgroundColor: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23b9c8de' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 0.75rem center",
                    backgroundSize: "1rem",
                  }}
                >
                  {p.accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.bankName}) —{" "}
                      {p.formatCurrency(account.balance)}
                    </option>
                  ))}
                </select>
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
                    <select
                      id="exp-fund"
                      value={p.fundCategory}
                      onChange={(e) => p.setFundCategory(e.target.value)}
                      required
                      className={cn(consoleField, "cursor-pointer appearance-none pr-10")}
                      style={{
                        backgroundColor: TOKENS.surfaceLow,
                        borderColor: TOKENS.outlineGhost,
                        color: TOKENS.onSurface,
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23b9c8de' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 0.75rem center",
                        backgroundSize: "1rem",
                      }}
                    >
                      <option value="">Select fund</option>
                      {FUND_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
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
                <select
                  id="exp-ec"
                  value={p.expenseCategory}
                  onChange={(e) => p.setExpenseCategory(e.target.value)}
                  className={cn(consoleField, "cursor-pointer appearance-none pr-10")}
                  style={{
                    backgroundColor: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23b9c8de' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 0.75rem center",
                    backgroundSize: "1rem",
                  }}
                >
                  <option value="">Optional</option>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
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
            <form onSubmit={p.handleBulkSubmit} className="mt-6 space-y-5">
              <div>
                <label
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Account
                </label>
                <select
                  value={p.bulkAccountId}
                  onChange={(e) => p.setBulkAccountId(e.target.value)}
                  className={cn(consoleField, "cursor-pointer appearance-none pr-10")}
                  style={{
                    backgroundColor: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23b9c8de' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 0.75rem center",
                    backgroundSize: "1rem",
                  }}
                >
                  {p.accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.bankName})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    Default fund
                  </label>
                  <select
                    value={p.bulkFundCategory}
                    onChange={(e) => p.setBulkFundCategory(e.target.value)}
                    className={cn(consoleField, "cursor-pointer appearance-none pr-10")}
                    style={{
                      backgroundColor: TOKENS.surfaceLow,
                      borderColor: TOKENS.outlineGhost,
                      color: TOKENS.onSurface,
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23b9c8de' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 0.75rem center",
                      backgroundSize: "1rem",
                    }}
                  >
                    <option value="">—</option>
                    {FUND_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    Default expense type
                  </label>
                  <select
                    value={p.bulkExpenseCategory}
                    onChange={(e) => p.setBulkExpenseCategory(e.target.value)}
                    className={cn(consoleField, "cursor-pointer appearance-none pr-10")}
                    style={{
                      backgroundColor: TOKENS.surfaceLow,
                      borderColor: TOKENS.outlineGhost,
                      color: TOKENS.onSurface,
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23b9c8de' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 0.75rem center",
                      backgroundSize: "1rem",
                    }}
                  >
                    <option value="">—</option>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
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
        className="rounded-xl border p-5 sm:p-6"
        style={{
          background: TOKENS.surfaceLow,
          borderColor: TOKENS.outlineGhost,
          boxShadow: CARD_INSET,
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Recurring
            </p>
            <p
              className="mt-1 text-sm"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Templates &amp; quick log for today
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
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
            {p.showRecurringForm ? "Close" : "Add template"}
          </button>
        </div>
        {p.showRecurringForm && (
          <form
            onSubmit={p.handleAddRecurring}
            className="mt-4 flex flex-col gap-4 rounded-xl border p-4"
            style={{
              borderColor: TOKENS.outlineGhost,
              background: TOKENS.surfaceContainer,
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Account *
                </label>
                <select
                  value={p.recurringAccountId}
                  onChange={(e) => p.setRecurringAccountId(e.target.value)}
                  required
                  className={cn(consoleField, "cursor-pointer appearance-none pr-10")}
                  style={{
                    backgroundColor: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23b9c8de' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 0.75rem center",
                    backgroundSize: "1rem",
                  }}
                >
                  {p.accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
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
                <select
                  value={p.recurringFrequency}
                  onChange={(e) => p.setRecurringFrequency(e.target.value)}
                  className={cn(consoleField, "cursor-pointer appearance-none pr-10")}
                  style={{
                    backgroundColor: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23b9c8de' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 0.75rem center",
                    backgroundSize: "1rem",
                  }}
                >
                  {FREQUENCIES.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
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
                <select
                  value={p.recurringFundCategory}
                  onChange={(e) => p.setRecurringFundCategory(e.target.value)}
                  className={cn(consoleField, "cursor-pointer appearance-none pr-10")}
                  style={{
                    backgroundColor: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23b9c8de' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 0.75rem center",
                    backgroundSize: "1rem",
                  }}
                >
                  <option value="">—</option>
                  {FUND_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Expense category
                </label>
                <select
                  value={p.recurringExpenseCategory}
                  onChange={(e) =>
                    p.setRecurringExpenseCategory(e.target.value)
                  }
                  className={cn(consoleField, "cursor-pointer appearance-none pr-10")}
                  style={{
                    backgroundColor: TOKENS.surfaceLow,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23b9c8de' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 0.75rem center",
                    backgroundSize: "1rem",
                  }}
                >
                  <option value="">—</option>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
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
      </section>

      {p.loadingExpenses ? (
        <IncomeHistorySkeleton variant="console" />
      ) : null}

      {!p.loadingExpenses && (
        <section
          className="rounded-xl border p-5 sm:p-7"
          style={{
            background: TOKENS.surfaceContainer,
            borderColor: TOKENS.outlineGhost,
            boxShadow: CARD_INSET,
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
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
                Showing {p.expenses.length} of {p.expensesTotal} entries
              </p>
            </div>
            <div className="flex items-center gap-2">
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
            </div>
          </div>

          <div
            className={cn(
              "mt-4 overflow-hidden transition-[max-height,opacity] duration-300",
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
                  <select
                    value={p.filterFundCategory}
                    onChange={(e) => p.setFilterFundCategory(e.target.value)}
                    className={cn(consoleField, "cursor-pointer appearance-none pr-10")}
                    style={{
                      backgroundColor: TOKENS.surfaceContainer,
                      borderColor: TOKENS.outlineGhost,
                      color: TOKENS.onSurface,
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23b9c8de' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 0.75rem center",
                      backgroundSize: "1rem",
                    }}
                  >
                    <option value="">All</option>
                    {FUND_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    Expense type
                  </label>
                  <select
                    value={p.filterExpenseCategory}
                    onChange={(e) => p.setFilterExpenseCategory(e.target.value)}
                    className={cn(consoleField, "cursor-pointer appearance-none pr-10")}
                    style={{
                      backgroundColor: TOKENS.surfaceContainer,
                      borderColor: TOKENS.outlineGhost,
                      color: TOKENS.onSurface,
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23b9c8de' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 0.75rem center",
                      backgroundSize: "1rem",
                    }}
                  >
                    <option value="">All</option>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: TOKENS.onSurfaceMuted }}
                  >
                    Account
                  </label>
                  <select
                    value={p.filterAccountId}
                    onChange={(e) => p.setFilterAccountId(e.target.value)}
                    className={cn(consoleField, "cursor-pointer appearance-none pr-10")}
                    style={{
                      backgroundColor: TOKENS.surfaceContainer,
                      borderColor: TOKENS.outlineGhost,
                      color: TOKENS.onSurface,
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23b9c8de' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 0.75rem center",
                      backgroundSize: "1rem",
                    }}
                  >
                    <option value="">All accounts</option>
                    {p.accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.bankName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {p.expenses.length === 0 ? (
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
                            background: `color-mix(in srgb, ${TOKENS.tertiary} 14%, ${TOKENS.surfaceHigh})`,
                            color: TOKENS.tertiary,
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

          {p.expensesTotal > 0 && (
            <div
              className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t pt-4"
              style={{ borderColor: TOKENS.outlineGhost }}
            >
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Showing {(p.expensesPage - 1) * p.expensesLimit + 1}–
                {Math.min(
                  p.expensesPage * p.expensesLimit,
                  p.expensesTotal,
                )}{" "}
                of {p.expensesTotal}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={p.expensesPage <= 1}
                  onClick={() => p.fetchExpenses(p.expensesPage - 1)}
                  aria-label="Previous page"
                  className={cn(
                    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-[color,background-color,border-color,transform,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4edea3]/40",
                    p.expensesPage <= 1
                      ? "cursor-not-allowed opacity-35"
                      : "hover:bg-white/6 hover:shadow-[inset_0_1px_0_0_rgba(218,226,253,0.08)] active:scale-[0.97]",
                  )}
                  style={{
                    borderColor: TOKENS.outlineGhost,
                    color:
                      p.expensesPage <= 1
                        ? TOKENS.onSurfaceMuted
                        : TOKENS.onSurface,
                  }}
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  disabled={
                    p.expensesPage >=
                    Math.ceil(p.expensesTotal / p.expensesLimit)
                  }
                  onClick={() => p.fetchExpenses(p.expensesPage + 1)}
                  aria-label="Next page"
                  className={cn(
                    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-[color,background-color,border-color,transform,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4edea3]/40",
                    p.expensesPage >=
                      Math.ceil(p.expensesTotal / p.expensesLimit)
                      ? "cursor-not-allowed opacity-35"
                      : "hover:bg-white/6 hover:shadow-[inset_0_1px_0_0_rgba(218,226,253,0.08)] active:scale-[0.97]",
                  )}
                  style={{
                    borderColor: TOKENS.outlineGhost,
                    color:
                      p.expensesPage >=
                      Math.ceil(p.expensesTotal / p.expensesLimit)
                        ? TOKENS.onSurfaceMuted
                        : TOKENS.onSurface,
                  }}
                >
                  <ChevronRight className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
            </div>
          )}

        </section>
      )}

      {!p.loadingAccounts && (
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
              <p
                className="mt-3 max-w-3xl text-sm leading-snug"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Based on the current month outflow of{" "}
                <span style={{ color: TOKENS.onSurface }}>
                  {p.formatCurrency(monthTotal)}
                </span>
                , your current liquid reserves provide{" "}
                <span style={{ color: TOKENS.onSurface }}>
                  {runwayMonths === null ? "—" : `${runwayMonths.toFixed(1)} months`}
                </span>{" "}
                of operational runway without further capital injection.
              </p>
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
      )}

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
