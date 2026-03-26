"use client"

import { useEffect, useMemo, useState } from "react"
import { DateInput } from "@/components/ui/date-input"
import { cn } from "@/lib/utils"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import type { StatementTransaction, StatementAccount } from "@/hooks/use-statement-page"
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowLeftRight,
  TrendingUp,
} from "lucide-react"

const consoleField =
  "mt-1 w-full rounded-xl border px-3 py-2.5 text-sm tabular-nums transition-[box-shadow] focus:outline-none focus:ring-2 focus:ring-[#4edea3]/45 [color-scheme:dark]"

const TX_PAGE_SIZE = 12

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function csvEscape(v: string) {
  if (v.includes(",") || v.includes("\"") || v.includes("\n")) {
    return `"${v.replace(/"/g, "\"\"")}"`
  }
  return v
}

function txTypeLabel(t: StatementTransaction["type"]) {
  if (t === "income") return "Income"
  if (t === "expense") return "Expense"
  if (t === "transfer") return "Transfer"
  return "Investment"
}

function txTypeTagStyle(t: StatementTransaction["type"]) {
  if (t === "expense") {
    return {
      bg: `color-mix(in srgb, ${TOKENS.onSurfaceMuted} 10%, ${TOKENS.surfaceHigh})`,
      fg: TOKENS.onSurfaceMuted,
    }
  }
  if (t === "income") {
    return {
      bg: `color-mix(in srgb, ${TOKENS.primary} 14%, ${TOKENS.surfaceHigh})`,
      fg: TOKENS.primary,
    }
  }
  if (t === "transfer") {
    return { bg: TOKENS.surfaceHigh, fg: TOKENS.onSurfaceMuted }
  }
  return { bg: `color-mix(in srgb, ${TOKENS.secondary} 14%, ${TOKENS.surfaceHigh})`, fg: TOKENS.secondary }
}

export function StatementPageBento({
  accounts,
  transactions,
  totals,
  loadingSummary,
  loadingTransactions,
  filterStartDate,
  setFilterStartDate,
  filterEndDate,
  setFilterEndDate,
  filterAccountId,
  setFilterAccountId,
}: {
  accounts: StatementAccount[]
  transactions: StatementTransaction[]
  totals: {
    income: number
    expenses: number
    transfers: number
    investments: number
    net: number
  }
  loadingSummary: boolean
  loadingTransactions: boolean
  filterStartDate: string
  setFilterStartDate: (v: string) => void
  filterEndDate: string
  setFilterEndDate: (v: string) => void
  filterAccountId: string
  setFilterAccountId: (v: string) => void
}) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [page, setPage] = useState(1)

  const anyFilters = !!(filterStartDate || filterEndDate || filterAccountId)

  useEffect(() => {
    setPage(1)
  }, [filterStartDate, filterEndDate, filterAccountId])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(transactions.length / TX_PAGE_SIZE))
    setPage((p) => Math.min(p, maxPage))
  }, [transactions.length])

  const exportCsv = async () => {
    setExporting(true)
    try {
      const headers = [
        "Date",
        "Type",
        "Amount",
        "Description",
        "Category",
        "Account",
        "From Account",
        "To Account",
      ]
      const lines = [
        headers.join(","),
        ...transactions.map((t) => {
          const amount =
            t.type === "income"
              ? `+${t.amount.toFixed(2)}`
              : t.type === "expense"
                ? `-${t.amount.toFixed(2)}`
                : t.amount.toFixed(2)

          const account = t.account
            ? `${t.account.name} (${t.account.bankName})`
            : ""
          const from = t.fromAccount
            ? `${t.fromAccount.name} (${t.fromAccount.bankName})`
            : ""
          const to = t.toAccount ? `${t.toAccount.name} (${t.toAccount.bankName})` : ""
          return [
            csvEscape(formatDateShort(t.date)),
            csvEscape(txTypeLabel(t.type)),
            csvEscape(amount),
            csvEscape(t.description ?? ""),
            csvEscape(t.category ?? ""),
            csvEscape(account),
            csvEscape(from),
            csvEscape(to),
          ].join(",")
        }),
      ]
      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `statement-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date()),
    [],
  )

  const totalRows = transactions.length
  const maxPage = Math.max(1, Math.ceil(totalRows / TX_PAGE_SIZE))
  const pageStart = totalRows === 0 ? 0 : (page - 1) * TX_PAGE_SIZE + 1
  const pageEnd = Math.min(totalRows, page * TX_PAGE_SIZE)
  const pagedTransactions = useMemo(() => {
    const startIdx = (page - 1) * TX_PAGE_SIZE
    return transactions.slice(startIdx, startIdx + TX_PAGE_SIZE)
  }, [transactions, page])

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <section className="lg:col-span-8">
          <div className="px-1 py-2 sm:px-2">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.28em]"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              {anyFilters ? "Filtered statement" : `${monthLabel} statement`}
            </p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
              <div className="text-4xl font-black leading-none tracking-tight sm:text-5xl">
                <MajorFigureCurrency
                  amount={Math.abs(totals.net)}
                  variant={totals.net >= 0 ? "prosperity" : "loss"}
                  className="font-black!"
                  decimalEm={0.45}
                />
              </div>
              <div
                className="inline-flex items-center rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
                style={{
                  background: `color-mix(in srgb, ${
                    totals.net >= 0 ? TOKENS.primary : TOKENS.onSurfaceMuted
                  } 18%, ${TOKENS.surfaceLow})`,
                  border: `1px solid ${TOKENS.outlineGhost}`,
                  color: totals.net >= 0 ? TOKENS.primary : TOKENS.onSurfaceMuted,
                  boxShadow: CARD_INSET,
                }}
              >
                {totalRows} rows
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(
                [
                  {
                    label: "Total income",
                    value: totals.income,
                    variant: "prosperity" as const,
                    Icon: ArrowUpCircle,
                    iconColor: TOKENS.primary,
                  },
                  {
                    label: "Total expenses",
                    value: totals.expenses,
                    variant: "loss" as const,
                    Icon: ArrowDownCircle,
                    iconColor: TOKENS.onSurfaceMuted,
                  },
                  {
                    label: "Transfers",
                    value: totals.transfers,
                    variant: "neutral" as const,
                    Icon: ArrowLeftRight,
                    iconColor: TOKENS.onSurfaceMuted,
                  },
                  {
                    label: "Investments",
                    value: totals.investments,
                    variant: "neutral" as const,
                    Icon: TrendingUp,
                    iconColor: TOKENS.secondary,
                  },
                ] as const
              ).map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl border p-5"
                  style={{
                    background: TOKENS.surfaceContainer,
                    borderColor: TOKENS.outlineGhost,
                    boxShadow: CARD_INSET,
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p
                      className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                      style={{ color: TOKENS.onSurfaceMuted }}
                    >
                      {card.label}
                    </p>
                    <card.Icon className="h-4 w-4" style={{ color: card.iconColor }} />
                  </div>
                  <div className="mt-3 text-lg font-semibold tabular-nums" style={{ color: TOKENS.onSurface }}>
                    {loadingSummary ? (
                      <div className="h-7 w-40 rounded-md" style={{ background: TOKENS.surfaceHigh }} />
                    ) : (
                      <MajorFigureCurrency
                        amount={card.value}
                        variant={card.variant}
                        className="text-lg font-semibold!"
                        decimalEm={0.45}
                      />
                    )}
                  </div>
                </div>
              ))}
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
            <p className="mt-3 text-sm leading-snug" style={{ color: TOKENS.onSurfaceMuted }}>
              Export a consolidated ledger snapshot for sharing or audit trails.
            </p>

            <button
              type="button"
              disabled={exporting || transactions.length === 0}
              onClick={exportCsv}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-xs font-bold uppercase tracking-[0.2em] transition-opacity hover:opacity-95 disabled:opacity-50"
              style={{
                background: TOKENS.primary,
                color: TOKENS.surface,
                boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
              }}
            >
              <Download className="h-4 w-4" strokeWidth={2.5} />
              Export statement
            </button>

            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="mt-3 w-full rounded-xl border py-3 text-center text-[10px] font-bold uppercase tracking-[0.18em] transition-opacity hover:opacity-90"
              style={{
                borderColor: TOKENS.outlineGhost,
                color: TOKENS.onSurfaceMuted,
              }}
            >
              Filters
            </button>
          </div>
        </section>
      </div>

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
            <h3 className="text-base font-semibold" style={{ color: TOKENS.onSurface }}>
              Transaction History
            </h3>
            <p className="mt-1 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
              {totalRows === 0 ? "No rows" : `Showing ${pageStart}–${pageEnd} of ${totalRows}`}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:bg-white/6"
            style={{ borderColor: TOKENS.outlineGhost, color: TOKENS.onSurfaceMuted }}
            aria-label="Filter"
            title="Toggle filters"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>

        <div
          className={cn(
            "mt-4 overflow-hidden transition-[max-height,opacity] duration-300",
            filtersOpen ? "max-h-[260px] opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <div
            className="rounded-xl border p-4"
            style={{
              background: TOKENS.surfaceLow,
              borderColor: TOKENS.outlineGhost,
              boxShadow: CARD_INSET,
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Filters
              </p>
              {anyFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterStartDate("")
                    setFilterEndDate("")
                    setFilterAccountId("")
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
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
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
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className={cn(consoleField, "border-transparent")}
                  style={{
                    background: TOKENS.surfaceContainer,
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
                  Account
                </label>
                <select
                  value={filterAccountId}
                  onChange={(e) => setFilterAccountId(e.target.value)}
                  className={cn(consoleField, "cursor-pointer appearance-none pr-10")}
                  style={{
                    backgroundColor: TOKENS.surfaceContainer,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                    backgroundImage: `url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23b9c8de' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 0.75rem center",
                    backgroundSize: "1rem",
                  }}
                >
                  <option value="">All accounts</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.bankName})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {loadingTransactions ? (
          <div className="mt-5 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-xl border"
                style={{
                  background: TOKENS.surfaceLow,
                  borderColor: TOKENS.outlineGhost,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="mt-5 space-y-2">
            {totalRows === 0 ? (
              <div className="py-14 text-center">
                <p className="text-base font-semibold" style={{ color: TOKENS.onSurface }}>
                  No rows in this range
                </p>
                <p className="mt-2 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
                  Adjust filters or add transactions.
                </p>
              </div>
            ) : (
              pagedTransactions.map((t) => {
                const tag = txTypeTagStyle(t.type)
                const amountVariant =
                  t.type === "expense"
                    ? ("loss" as const)
                    : t.type === "income"
                      ? ("prosperity" as const)
                      : ("neutral" as const)

                const title =
                  t.description?.trim() ||
                  (t.type === "transfer"
                    ? "Transfer"
                    : t.type === "investment"
                      ? "Investment"
                      : t.type === "expense"
                        ? "Expense"
                        : "Income")

                const meta =
                  t.type === "transfer"
                    ? `${t.fromAccount?.name ?? "From"} → ${t.toAccount?.name ?? "To"}`
                    : t.account
                      ? `${t.account.bankName} · ${t.account.name}`
                      : ""

                return (
                  <div
                    key={`${t.type}:${t.id}`}
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
                        {title}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span
                          className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                          style={{
                            background: tag.bg,
                            color: tag.fg,
                            border: `1px solid ${TOKENS.outlineGhost}`,
                          }}
                        >
                          {txTypeLabel(t.type)}
                        </span>
                        {meta ? (
                          <span
                            className="text-xs"
                            style={{ color: TOKENS.onSurfaceMuted }}
                          >
                            {meta}
                          </span>
                        ) : null}
                        <span
                          className="text-xs tabular-nums"
                          style={{ color: TOKENS.onSurfaceMuted }}
                        >
                          {formatDateShort(t.date)}
                        </span>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <MajorFigureCurrency
                        amount={t.amount}
                        variant={amountVariant}
                        className="text-base font-bold!"
                        decimalEm={0.45}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {!loadingTransactions && totalRows > 0 && (
          <div
            className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t pt-4"
            style={{ borderColor: TOKENS.outlineGhost }}
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: TOKENS.onSurfaceMuted }}
            >
              Page {page} of {maxPage}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
                className={cn(
                  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-[color,background-color,border-color,transform,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4edea3]/40",
                  page <= 1
                    ? "cursor-not-allowed opacity-35"
                    : "hover:bg-white/6 hover:shadow-[inset_0_1px_0_0_rgba(218,226,253,0.08)] active:scale-[0.97]",
                )}
                style={{
                  borderColor: TOKENS.outlineGhost,
                  color: page <= 1 ? TOKENS.onSurfaceMuted : TOKENS.onSurface,
                }}
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                type="button"
                disabled={page >= maxPage}
                onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
                aria-label="Next page"
                className={cn(
                  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-[color,background-color,border-color,transform,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4edea3]/40",
                  page >= maxPage
                    ? "cursor-not-allowed opacity-35"
                    : "hover:bg-white/6 hover:shadow-[inset_0_1px_0_0_rgba(218,226,253,0.08)] active:scale-[0.97]",
                )}
                style={{
                  borderColor: TOKENS.outlineGhost,
                  color: page >= maxPage ? TOKENS.onSurfaceMuted : TOKENS.onSurface,
                }}
              >
                <ChevronRight className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  )
}

