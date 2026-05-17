"use client"

import { useCallback, useRef } from "react"
import { cn } from "@/lib/utils"
import { consoleFocus } from "@/components/wealth-console/console-ui"
import {
  expenseMicroLabelClass,
  expenseMicroLabelStyle,
} from "@/components/expenses/expense-console-ui"
import { TOKENS } from "@/lib/wealth-console-tokens"
import type { CategoryChartEntry } from "@/components/expenses/expense-category-chart"

type ExpenseCategoryLedgerProps = {
  categories: CategoryChartEntry[]
  selectedCategory: string | null
  onSelectCategory: (category: string) => void
  formatCurrency: (amount: number) => string
}

export function ExpenseCategoryLedger({
  categories,
  selectedCategory,
  onSelectCategory,
  formatCurrency,
}: ExpenseCategoryLedgerProps) {
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])

  const focusOption = useCallback((index: number) => {
    const el = optionRefs.current[index]
    el?.focus()
  }, [])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (categories.length === 0) return

    const currentIndex = categories.findIndex(
      (c) => c.category === selectedCategory,
    )
    const startIndex = currentIndex >= 0 ? currentIndex : 0

    let nextIndex = startIndex
    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        event.preventDefault()
        nextIndex = (startIndex + 1) % categories.length
        break
      case "ArrowUp":
      case "ArrowLeft":
        event.preventDefault()
        nextIndex = (startIndex - 1 + categories.length) % categories.length
        break
      case "Home":
        event.preventDefault()
        nextIndex = 0
        break
      case "End":
        event.preventDefault()
        nextIndex = categories.length - 1
        break
      default:
        return
    }

    const next = categories[nextIndex]
    if (next) {
      onSelectCategory(next.category)
      focusOption(nextIndex)
    }
  }

  return (
    <div
      className="rounded-[1.5rem] border p-4 sm:p-5"
      style={{ borderColor: TOKENS.outlineGhost, background: TOKENS.surfaceLow }}
    >
      <p
        id="expense-category-ledger-label"
        className={expenseMicroLabelClass}
        style={expenseMicroLabelStyle()}
      >
        Category ledger
      </p>
      <div
        className="mt-4 space-y-3"
        role="radiogroup"
        aria-labelledby="expense-category-ledger-label"
        onKeyDown={handleKeyDown}
      >
        {categories.map((category, index) => {
          const checked = selectedCategory === category.category
          return (
            <button
              key={category.category}
              ref={(el) => {
                optionRefs.current[index] = el
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked || (selectedCategory === null && index === 0) ? 0 : -1}
              onClick={() => onSelectCategory(category.category)}
              className={cn(
                "grid w-full min-h-11 grid-cols-[auto_1fr_auto_auto] items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                consoleFocus,
              )}
              style={{
                borderColor: checked ? category.fill : TOKENS.outlineGhost,
                background: checked ? TOKENS.surfaceContainer : "transparent",
              }}
            >
              <span
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold"
                style={{
                  color: category.fill,
                  background: TOKENS.surfaceContainer,
                  border: `1px solid ${TOKENS.outlineGhost}`,
                }}
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <p
                  className="truncate text-sm font-medium"
                  style={{ color: TOKENS.onSurface }}
                >
                  {category.label}
                </p>
                <p
                  className="text-[11px] tabular-nums"
                  style={{ color: TOKENS.onSurfaceMuted }}
                >
                  {category.count} transactions
                </p>
              </div>
              <span
                className="text-sm tabular-nums"
                style={{ color: TOKENS.onSurfaceMuted }}
              >
                {category.sharePct.toFixed(1)}%
              </span>
              <span
                className="text-sm font-semibold tabular-nums"
                style={{ color: TOKENS.onSurface }}
              >
                {formatCurrency(category.amount)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
