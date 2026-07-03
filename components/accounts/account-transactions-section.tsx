"use client"

import { useEffect, useMemo, useState } from "react"
import { Receipt } from "lucide-react"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { ConsolePaginationBar } from "@/components/wealth-console/console-pagination"
import { CARD_INSET, CONSOLE_TABLE_PAGE_SIZE, TOKENS } from "@/lib/wealth-console-tokens"
import type { StatementTransaction } from "@/hooks/use-statement-page"
import { expenseLabel, fundLabel } from "@/components/expenses/expense-shared"

const EXPENSE_TYPE_TAG_FG = "#f87171"

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
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
  return {
    bg: `color-mix(in srgb, ${TOKENS.secondary} 14%, ${TOKENS.surfaceHigh})`,
    fg: TOKENS.secondary,
  }
}

export function AccountTransactionsSection({ accountId }: { accountId: string }) {
  const [transactions, setTransactions] = useState<StatementTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    setPage(1)
    fetch(`/api/accounts/${accountId}/transactions`)
      .then((r) => r.json())
      .then((data) => setTransactions(data.transactions ?? []))
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false))
  }, [accountId])

  const pagedTransactions = useMemo(() => {
    const start = (page - 1) * CONSOLE_TABLE_PAGE_SIZE
    return transactions.slice(start, start + CONSOLE_TABLE_PAGE_SIZE)
  }, [page, transactions])

  return (
    <section
      className="mt-4 rounded-xl border"
      style={{
        background: TOKENS.surfaceContainer,
        borderColor: TOKENS.outlineGhost,
        boxShadow: CARD_INSET,
      }}
      aria-labelledby="account-transactions-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-7">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4" style={{ color: TOKENS.secondary }} />
            <h2
              id="account-transactions-heading"
              className="text-base font-semibold tracking-tight"
              style={{ color: TOKENS.onSurface }}
            >
              Transactions
            </h2>
          </div>
          <p className="mt-1 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
            {loading
              ? "Loading transactions…"
              : transactions.length === 0
                ? "No transactions recorded for this account yet"
                : `Showing ${pagedTransactions.length} of ${transactions.length} transactions`}
          </p>
        </div>
      </div>

      <div
        className="border-t px-5 py-5 sm:px-7"
        style={{ borderColor: TOKENS.outlineGhost }}
      >
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-xl border animate-pulse"
                style={{
                  background: TOKENS.surfaceLow,
                  borderColor: TOKENS.outlineGhost,
                }}
              />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm font-semibold" style={{ color: TOKENS.onSurface }}>
              No transactions yet
            </p>
            <p className="mt-2 text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
              Income, expenses, and transfers linked to this account will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {pagedTransactions.map((t) => {
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
                  : null

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
                      {t.type === "expense" && t.category ? (
                        <span
                          className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                          style={{
                            background: `color-mix(in srgb, ${TOKENS.secondary} 16%, ${TOKENS.surfaceHigh})`,
                            color: TOKENS.secondary,
                            border: `1px solid ${TOKENS.outlineGhost}`,
                          }}
                        >
                          {fundLabel(t.category)}
                        </span>
                      ) : null}
                      {t.type === "expense" && t.expenseCategory ? (
                        <span
                          className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                          style={{
                            background: `color-mix(in srgb, ${TOKENS.loss} 18%, ${TOKENS.surfaceHigh})`,
                            color: TOKENS.loss,
                            border: `1px solid ${TOKENS.outlineGhost}`,
                          }}
                        >
                          {expenseLabel(t.expenseCategory)}
                        </span>
                      ) : null}
                      {t.type === "expense" && !t.category && !t.expenseCategory ? (
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
                      ) : null}
                      {meta ? (
                        <span className="text-xs" style={{ color: TOKENS.onSurfaceMuted }}>
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
            })}
          </div>
        )}

        {!loading && transactions.length > CONSOLE_TABLE_PAGE_SIZE && (
          <ConsolePaginationBar
            page={page}
            pageSize={CONSOLE_TABLE_PAGE_SIZE}
            total={transactions.length}
            onPageChange={setPage}
          />
        )}
      </div>
    </section>
  )
}
