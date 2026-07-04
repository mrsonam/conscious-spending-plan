"use client"

import { useEffect, useMemo, useState } from "react"
import { DateInput } from "@/components/ui/date-input"
import { AppSelect } from "@/components/ui/app-select"
import { cn } from "@/lib/utils"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { ScrambleCurrencyValue } from "@/components/ui/scramble-number"
import { ConsolePaginationBar } from "@/components/wealth-console/console-pagination"
import { CARD_INSET, CONSOLE_TABLE_PAGE_SIZE, TOKENS } from "@/lib/wealth-console-tokens"
import type { StatementTransaction, StatementAccount } from "@/hooks/use-statement-page"
import {
  Download,
  Filter,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowLeftRight,
  TrendingUp,
} from "lucide-react"

const consoleField =
  "mt-1 w-full rounded-xl border px-3 py-2.5 text-sm tabular-nums transition-[box-shadow] focus:outline-none focus:ring-2 focus:ring-[#4edea3]/45 [color-scheme:dark]"

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

/** Statement row pill for expense transactions, red on dark shell (parity with classic red-50/red-700). */
const EXPENSE_TYPE_TAG_FG = "#f87171"

function txTypeTagStyle(t: StatementTransaction["type"]) {
  if (t === "expense") {
    return {
      bg: `color-mix(in srgb, ${EXPENSE_TYPE_TAG_FG} 18%, ${TOKENS.surfaceHigh})`,
      fg: EXPENSE_TYPE_TAG_FG,
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
  totalRows,
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
  totalRows: number
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
    const maxPage = Math.max(
      1,
      Math.ceil(transactions.length / CONSOLE_TABLE_PAGE_SIZE),
    )
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
        "Budget allocation",
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
          const budgetAllocation =
            t.type === "income"
              ? t.excludeFromAllocation
                ? "No (excluded)"
                : "Yes"
              : ""
          return [
            csvEscape(formatDateShort(t.date)),
            csvEscape(txTypeLabel(t.type)),
            csvEscape(amount),
            csvEscape(t.description ?? ""),
            csvEscape(t.category ?? ""),
            csvEscape(budgetAllocation),
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

  const visibleRows = loadingTransactions ? totalRows : transactions.length
  const pagedTransactions = useMemo(() => {
    const startIdx = (page - 1) * CONSOLE_TABLE_PAGE_SIZE
    return transactions.slice(startIdx, startIdx + CONSOLE_TABLE_PAGE_SIZE)
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
                {loadingSummary ? (
                  <ScrambleCurrencyValue
                    variant={totals.net >= 0 ? "prosperity" : "loss"}
                    min={400}
                    max={22000}
                    className="font-black!"
                    decimalEm={0.45}
                  />
                ) : (
                  <MajorFigureCurrency
                    amount={Math.abs(totals.net)}
                    variant={totals.net >= 0 ? "prosperity" : "loss"}
                    className="font-black!"
                    decimalEm={0.45}
                  />
                )}
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
                {visibleRows} rows
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
                      <ScrambleCurrencyValue
                        min={card.label === "Total income" ? 1200 : 200}
                        max={
                          card.label === "Total income"
                            ? 15000
                            : card.label === "Total expenses"
                              ? 9000
                              : card.label === "Transfers"
                                ? 7000
                                : 6000
                        }
                        variant={card.variant}
                        className="text-lg font-semibold!"
                      />
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
              {visibleRows === 0
                ? "No rows in this range"
                : "Combined ledger across income, expenses, transfers, and investments"}
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
                <AppSelect
                  value={filterAccountId}
                  onValueChange={setFilterAccountId}
                 
                  className={cn(consoleField, "mt-1 border-transparent")}
                  style={{
                    backgroundColor: TOKENS.surfaceContainer,
                    borderColor: TOKENS.outlineGhost,
                    color: TOKENS.onSurface,
                  }}
                  placeholder="All accounts"
                  options={[
                    { value: "", label: "All accounts" },
                    ...accounts.map((a) => ({
                      value: a.id,
                      label: `${a.name} (${a.bankName})`,
                    })),
                  ]}
                />
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
            {visibleRows === 0 ? (
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
                        {t.type === "income" && t.excludeFromAllocation ? (
                          <span
                            className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                            style={{
                              background: TOKENS.surfaceHigh,
                              color: TOKENS.onSurfaceMuted,
                              border: `1px solid ${TOKENS.outlineGhost}`,
                            }}
                          >
                            Not allocated
                          </span>
                        ) : null}
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

        {!loadingTransactions && visibleRows > 0 && (
          <ConsolePaginationBar
            page={page}
            pageSize={CONSOLE_TABLE_PAGE_SIZE}
            total={visibleRows}
            onPageChange={setPage}
          />
        )}
      </section>
    </>
  )
}
