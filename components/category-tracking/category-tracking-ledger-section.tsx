"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { MajorFigureCurrency } from "@/lib/currency-major-figure"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import {
  TRACKING_FUND_CATEGORIES,
  expenseTypeLabel,
} from "@/lib/category-tracking-shared"
import type { CategoryTrackingExpense } from "@/hooks/use-category-tracking-page"
import { BENTO } from "@/lib/app-routes"

type ExpenseTypeRollup = { key: string; label: string; amount: number }

type CategoryTrackingLedgerSectionProps = {
  expenses: CategoryTrackingExpense[]
  expenseTypeRollup: ExpenseTypeRollup[]
  formatCurrency: (amount: number) => string
  formatDate: (date: string) => string
}

export function CategoryTrackingLedgerSection({
  expenses,
  expenseTypeRollup,
  formatCurrency,
  formatDate,
}: CategoryTrackingLedgerSectionProps) {
  const CATEGORIES = TRACKING_FUND_CATEGORIES

  return (
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
  )
}
