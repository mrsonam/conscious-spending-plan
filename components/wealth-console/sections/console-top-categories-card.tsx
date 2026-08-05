"use client"

import { useMemo } from "react"
import Link from "next/link"
import { ArrowUpRight, PieChart } from "lucide-react"
import { BENTO } from "@/lib/app-routes"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import {
  consoleFocus,
  consoleMicroLabel,
} from "@/components/wealth-console/console-ui"
import { cn } from "@/lib/utils"
import { useFormatCurrency } from "@/hooks/use-format-currency"
import { expenseLabel } from "@/components/expenses/expense-shared"
import {
  CONSOLE_TILE_FLOAT_SHADOW,
  type ConsoleCardTone,
} from "@/components/wealth-console/sections/console-subscriptions-card"
import type { Expense } from "@/components/wealth-console/types"

const CATEGORIES_LIMIT = 5

function CategoryRowSkeleton() {
  return (
    <li className="animate-pulse" aria-hidden>
      <div className="flex items-center justify-between gap-3">
        <div className="h-4 w-2/5 rounded" style={{ background: TOKENS.surfaceHigh }} />
        <div className="h-4 w-14 rounded" style={{ background: TOKENS.surfaceHigh }} />
      </div>
      <div className="mt-2 h-2 w-full rounded-full" style={{ background: TOKENS.surfaceHigh }} />
    </li>
  )
}

export function ConsoleTopCategoriesCard({
  expenses,
  totalExpenses,
  loading,
  className,
  tone = "raised",
  floating = false,
}: {
  expenses: Expense[]
  totalExpenses: number
  loading: boolean
  className?: string
  tone?: ConsoleCardTone
  floating?: boolean
}) {
  const { formatCurrency } = useFormatCurrency()
  const recessed = tone === "recessed"
  const cardBg = recessed ? TOKENS.surfaceLow : TOKENS.surfaceContainer
  const chipBg = recessed ? TOKENS.surfaceContainer : TOKENS.surfaceLow


  const ranked = useMemo(() => {
    const sums = new Map<string, number>()
    for (const e of expenses) {
      const key = e.expenseCategory || "uncategorised"
      sums.set(key, (sums.get(key) ?? 0) + e.amount)
    }
    return [...sums.entries()]
      .map(([key, amount]) => ({
        key,
        label: key === "uncategorised" ? "Uncategorised" : expenseLabel(key) || key,
        amount,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, CATEGORIES_LIMIT)
  }, [expenses])

  const maxAmount = ranked[0]?.amount ?? 0
  const pending = loading && expenses.length === 0

  return (
    <div
      id="console-top-categories"
      className={cn("scroll-mt-28 flex min-w-0 flex-col", className)}
    >
      <div
        className={cn(
          "flex h-full flex-col rounded-xl p-5 sm:p-6",
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
                color: TOKENS.tertiary,
              }}
            >
              <PieChart className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                style={consoleMicroLabel}
              >
                Where it went
              </p>
              <p
                className="mt-1 max-w-xl text-xs leading-relaxed"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                Top spending categories this month.
              </p>
            </div>
          </div>
          <Link
            href={BENTO.expenses}
            className={cn(
              consoleFocus,
              "inline-flex min-h-11 shrink-0 items-center rounded-md p-1 transition-[background-color,transform] duration-150 hover:bg-white/5 active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100",
            )}
            aria-label="Open expenses"
          >
            <ArrowUpRight className="h-4 w-4" style={{ color: TOKENS.onSurfaceMuted }} />
          </Link>
        </div>

        <ul className="mt-5 flex flex-1 flex-col justify-start gap-4">
          {pending ? (
            Array.from({ length: 3 }).map((_, i) => <CategoryRowSkeleton key={i} />)
          ) : ranked.length === 0 ? (
            <li
              className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center"
              style={{ borderColor: TOKENS.outlineGhost }}
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{ background: chipBg, color: TOKENS.onSurfaceMuted }}
              >
                <PieChart className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: TOKENS.onSurface }}>
                  No spending yet this month
                </p>
                <p
                  className="mt-1 text-xs leading-relaxed"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  Categories will show up here as you log expenses.
                </p>
              </div>
            </li>
          ) : (
            ranked.map((row) => {
              const sharePct =
                totalExpenses > 0 ? (row.amount / totalExpenses) * 100 : 0
              const barPct = maxAmount > 0 ? (row.amount / maxAmount) * 100 : 0

              return (
                <li key={row.key}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p
                      className="min-w-0 truncate text-sm font-medium"
                      style={{ color: TOKENS.onSurface }}
                    >
                      {row.label}
                    </p>
                    <p
                      className="shrink-0 text-xs tabular-nums"
                      style={{ color: TOKENS.onSurfaceMuted }}
                    >
                      <span className="font-bold" style={{ color: TOKENS.onSurface }}>
                        {formatCurrency(row.amount)}
                      </span>{" "}
                      · {sharePct.toFixed(0)}%
                    </p>
                  </div>
                  <div
                    className="mt-2 h-2 overflow-hidden rounded-full"
                    style={{ background: chipBg }}
                    role="progressbar"
                    aria-valuenow={Math.round(sharePct)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${row.label}: ${sharePct.toFixed(0)} percent of monthly spending`}
                  >
                    <div
                      className="h-full origin-left rounded-full transition-transform duration-500 ease-out motion-reduce:transition-none"
                      style={{
                        // Bars scale against the top category so ranks compare
                        // visually; the % text carries the share of total.
                        transform: `scaleX(${Math.max(barPct, 2) / 100})`,
                        background: TOKENS.secondary,
                      }}
                    />
                  </div>
                </li>
              )
            })
          )}
        </ul>
      </div>
    </div>
  )
}
