"use client"

import {
  ScrambleCurrencyValue,
} from "@/components/ui/scramble-number"
import { CARD_INSET, TOKENS } from "@/lib/wealth-console-tokens"
import type { UseExpensePageResult } from "@/hooks/use-expense-page"

type ExpenseLiquiditySectionProps = {
  p: UseExpensePageResult
  averageMonthlySpending: number
  runwayMonths: number | null
  showSummarySkeleton: boolean
}

export function ExpenseLiquiditySection({
  p,
  averageMonthlySpending,
  runwayMonths,
  showSummarySkeleton,
}: ExpenseLiquiditySectionProps) {
  return (
    <section
      className="rounded-xl border p-6 sm:p-7"
      style={{
        background: TOKENS.surfaceContainer,
        borderColor: TOKENS.outlineGhost,
        boxShadow: CARD_INSET,
      }}
      aria-labelledby="expense-liquidity-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h2
            id="expense-liquidity-heading"
            className="text-[10px] font-semibold uppercase tracking-[0.28em]"
            style={{ color: TOKENS.primary }}
          >
            Liquidity buffer
          </h2>
          <p
            className="mt-3 max-w-3xl text-sm leading-snug"
            style={{ color: TOKENS.onSurfaceMuted }}
          >
            At your average monthly spending of{" "}
            <span style={{ color: TOKENS.onSurface }}>
              {showSummarySkeleton ? (
                <ScrambleCurrencyValue min={400} max={5400} className="font-medium!" />
              ) : (
                p.formatCurrency(averageMonthlySpending)
              )}
            </span>{" "}
            (last six months), your liquid balances would cover about{" "}
            <span style={{ color: TOKENS.onSurface }}>
              {runwayMonths === null ? "—" : `${runwayMonths.toFixed(1)} months`}
            </span>{" "}
            before you would need new income.
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
  )
}
