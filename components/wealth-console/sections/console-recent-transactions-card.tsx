"use client"

import Link from "next/link"
import { ArrowUpRight, Receipt } from "lucide-react"
import { BENTO } from "@/lib/app-routes"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { expenseLabel, fundLabel } from "@/components/expenses/expense-shared"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import {
  consoleFocus,
  consoleMicroLabel,
} from "@/components/wealth-console/console-ui"
import { cn } from "@/lib/utils"
import {
  CONSOLE_TILE_FLOAT_SHADOW,
  type ConsoleCardTone,
} from "@/components/wealth-console/sections/console-subscriptions-card"
import type { DashboardRecentTransaction } from "@/components/wealth-console/types"

const EXPENSE_PILL_FG = "#f87171"

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function typeLabel(type: DashboardRecentTransaction["type"]) {
  if (type === "income") return "Income"
  if (type === "expense") return "Expense"
  return "Transfer"
}

function typePillStyle(type: DashboardRecentTransaction["type"]) {
  if (type === "income") {
    return {
      bg: `color-mix(in srgb, ${TOKENS.primary} 14%, ${TOKENS.surfaceHigh})`,
      fg: TOKENS.primary,
    }
  }
  if (type === "expense") {
    return {
      bg: `color-mix(in srgb, ${EXPENSE_PILL_FG} 18%, ${TOKENS.surfaceHigh})`,
      fg: EXPENSE_PILL_FG,
    }
  }
  return { bg: TOKENS.surfaceHigh, fg: TOKENS.onSurfaceMuted }
}

function TransactionRowSkeleton({ chipBg }: { chipBg: string }) {
  return (
    <li
      className="animate-pulse rounded-xl border px-3.5 py-3"
      style={{
        background: chipBg,
        borderColor: TOKENS.outlineGhost,
        boxShadow: CARD_INSET,
      }}
      aria-hidden
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="h-4 w-2/5 rounded" style={{ background: TOKENS.surfaceHigh }} />
          <div className="mt-2.5 flex items-center gap-1.5">
            <div className="h-4 w-14 rounded-full" style={{ background: TOKENS.surfaceHigh }} />
            <div className="h-3 w-16 rounded" style={{ background: TOKENS.surfaceHigh }} />
          </div>
        </div>
        <div className="h-5 w-16 shrink-0 rounded" style={{ background: TOKENS.surfaceHigh }} />
      </div>
    </li>
  )
}

export function ConsoleRecentTransactionsCard({
  transactions,
  className,
  tone = "raised",
  floating = false,
}: {
  /** null while the secondary payload is still loading. */
  transactions: DashboardRecentTransaction[] | null
  className?: string
  tone?: ConsoleCardTone
  floating?: boolean
}) {
  const pending = transactions === null
  const recessed = tone === "recessed"
  const cardBg = recessed ? TOKENS.surfaceLow : TOKENS.surfaceContainer
  const chipBg = recessed ? TOKENS.surfaceContainer : TOKENS.surfaceLow
  return (
    <div
      id="console-recent-transactions"
      className={cn("scroll-mt-28 flex min-w-0 flex-col", className)}
    >
      <div
        className={cn(
          "flex h-full flex-col rounded-xl p-5 transition-colors hover:opacity-[0.98] sm:p-6",
          floating && "lg:-translate-y-2",
        )}
        style={{
          background: cardBg,
          boxShadow: floating ? CONSOLE_TILE_FLOAT_SHADOW : CARD_INSET,
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{
                background: chipBg,
                color: TOKENS.primary,
              }}
            >
              <Receipt className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                style={consoleMicroLabel}
              >
                Recent transactions
              </p>
              <p
                className="mt-1 max-w-xl text-xs leading-relaxed"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Latest income, expenses, and transfers.
              </p>
            </div>
          </div>
          <Link
            href={BENTO.statement}
            className={cn(
              consoleFocus,
              "inline-flex min-h-11 shrink-0 items-center rounded-md p-1 transition-colors hover:bg-white/5",
            )}
            aria-label="Open statement"
          >
            <ArrowUpRight className="h-4 w-4" style={{ color: TOKENS.onSurfaceMuted }} />
          </Link>
        </div>

        <ul className="mt-5 flex flex-1 flex-col gap-2">
          {pending ? (
            Array.from({ length: 3 }).map((_, i) => <TransactionRowSkeleton key={i} chipBg={chipBg} />)
          ) : transactions.length === 0 ? (
            <li
              className="flex flex-1 items-center rounded-xl border border-dashed px-4 py-8 text-center text-sm leading-snug"
              style={{
                borderColor: TOKENS.outlineGhost,
                color: TOKENS.onSurfaceMuted,
              }}
            >
              No recent activity. Log income or an expense to see it here.
            </li>
          ) : (
            transactions.map((tx) => {
              const pill = typePillStyle(tx.type)
              const title =
                tx.description?.trim() ||
                (tx.type === "income"
                  ? "Income"
                  : tx.type === "transfer"
                    ? "Transfer"
                    : "Expense")
              const amountVariant =
                tx.type === "income"
                  ? ("prosperity" as const)
                  : tx.type === "expense"
                    ? ("loss" as const)
                    : ("neutral" as const)

              return (
                <li key={`${tx.type}:${tx.id}`}>
                  <Link
                    href={BENTO.statement}
                    className={cn(
                      consoleFocus,
                      "group block rounded-xl border px-3.5 py-3 transition-colors hover:bg-white/4",
                    )}
                    style={{
                      background: chipBg,
                      borderColor: TOKENS.outlineGhost,
                      boxShadow: CARD_INSET,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p
                          className="truncate text-sm font-medium leading-snug transition-colors group-hover:text-white"
                          style={{ color: TOKENS.onSurface }}
                        >
                          {title}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span
                            className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                            style={{
                              background: pill.bg,
                              color: pill.fg,
                              border: `1px solid ${TOKENS.outlineGhost}`,
                            }}
                          >
                            {typeLabel(tx.type)}
                          </span>
                          {tx.type === "expense" && tx.category ? (
                            <span
                              className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                              style={{
                                background: `color-mix(in srgb, ${TOKENS.secondary} 16%, ${TOKENS.surfaceHigh})`,
                                color: TOKENS.secondary,
                                border: `1px solid ${TOKENS.outlineGhost}`,
                              }}
                            >
                              {fundLabel(tx.category)}
                            </span>
                          ) : null}
                          {tx.type === "expense" && tx.expenseCategory ? (
                            <span
                              className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                              style={{
                                background: `color-mix(in srgb, ${EXPENSE_PILL_FG} 18%, ${TOKENS.surfaceHigh})`,
                                color: EXPENSE_PILL_FG,
                                border: `1px solid ${TOKENS.outlineGhost}`,
                              }}
                            >
                              {expenseLabel(tx.expenseCategory)}
                            </span>
                          ) : null}
                          <span
                            className="text-[10px] tabular-nums"
                            style={{ color: TOKENS.onSurfaceMuted }}
                          >
                            {formatDateShort(tx.date)}
                          </span>
                          {tx.accountLabel ? (
                            <span
                              className="truncate text-[10px]"
                              style={{ color: TOKENS.onSurfaceMuted }}
                            >
                              {tx.accountLabel}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <span className="inline-flex shrink-0 items-baseline gap-0.5">
                        {tx.type !== "transfer" ? (
                          <span
                            className="text-xs font-bold"
                            style={{
                              color: tx.type === "income" ? TOKENS.primary : EXPENSE_PILL_FG,
                            }}
                            aria-hidden
                          >
                            {tx.type === "income" ? "+" : "−"}
                          </span>
                        ) : null}
                        <MajorFigureCurrency
                          amount={tx.amount}
                          variant={amountVariant}
                          className="text-sm font-bold! sm:text-base!"
                          decimalEm={0.45}
                        />
                      </span>
                    </div>
                  </Link>
                </li>
              )
            })
          )}
        </ul>
      </div>
    </div>
  )
}
