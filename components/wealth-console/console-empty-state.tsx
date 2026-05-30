import Link from "next/link"
import { Minus, Plus } from "lucide-react"
import { BENTO } from "@/lib/app-routes"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { consoleFocus } from "@/components/wealth-console/console-ui"
import { cn } from "@/lib/utils"

type ConsoleEmptyStateProps = {
  onLogIncome?: () => void
  onLogExpense?: () => void
}

export function ConsoleEmptyState({ onLogIncome, onLogExpense }: ConsoleEmptyStateProps) {
  const hasQuickLog = Boolean(onLogIncome && onLogExpense)

  return (
    <div
      className="rounded-xl p-10 text-center"
      style={{ background: TOKENS.surfaceContainer }}
    >
      <p className="text-lg font-medium">No allocation data</p>
      <p className="mt-2 text-sm" style={{ color: TOKENS.onSurfaceMuted }}>
        Add income for the current month to see your Conscious Spending Plan.
      </p>
      {hasQuickLog ? (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onLogIncome}
            className={cn(
              consoleFocus,
              "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold"
            )}
            style={{
              background: TOKENS.primary,
              color: TOKENS.surface,
            }}
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
            Log income
          </button>
          <button
            type="button"
            onClick={onLogExpense}
            className={cn(
              consoleFocus,
              "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-5 py-2.5 text-sm font-semibold"
            )}
            style={{
              borderColor: TOKENS.outlineGhost,
              color: TOKENS.onSurface,
              background: TOKENS.surfaceLow,
            }}
          >
            <Minus className="h-4 w-4 shrink-0" aria-hidden />
            Log expense
          </button>
        </div>
      ) : (
        <Link
          href={BENTO.income}
          className={cn(
            consoleFocus,
            "mt-8 inline-flex min-h-11 items-center justify-center rounded-md px-5 py-2.5 text-sm font-semibold",
          )}
          style={{
            background: TOKENS.primary,
            color: TOKENS.surface,
          }}
        >
          Go to Income
        </Link>
      )}
    </div>
  )
}
