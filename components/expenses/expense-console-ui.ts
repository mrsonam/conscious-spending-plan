import { cn } from "@/lib/utils"
import { TOKENS } from "@/lib/wealth-console-tokens"
import {
  consoleFocus,
  consoleMicroLabel,
} from "@/components/wealth-console/console-ui"

/** Console text field / select trigger on expense surfaces. */
export const expenseConsoleField = cn(
  "mt-1 w-full rounded-xl border px-3 py-2.5 text-sm tabular-nums transition-[box-shadow] [color-scheme:dark]",
  consoleFocus,
)

/** Uppercase micro-label (AA contrast on surfaceContainer). */
export const expenseMicroLabelClass =
  "text-[10px] font-semibold uppercase tracking-[0.22em]"

export function expenseMicroLabelStyle() {
  return consoleMicroLabel
}

/** Form field label on expense dialogs and recurring form. */
export const expenseFieldLabelClass =
  "text-[10px] font-semibold uppercase tracking-wider"

export const expenseConsoleButtonClass = cn(
  "transition-colors hover:bg-white/6",
  consoleFocus,
)

export const EXPENSE_HISTORY_FILTERS_ID = "expense-history-filters-panel"

/** Tokenized chart series for category breakdown (full palette). */
export const EXPENSE_CATEGORY_CHART_COLORS = [
  TOKENS.primary,
  TOKENS.secondary,
  TOKENS.warning,
  TOKENS.tertiary,
  `color-mix(in srgb, ${TOKENS.primary} 55%, ${TOKENS.surfaceHigh})`,
  `color-mix(in srgb, ${TOKENS.secondary} 55%, ${TOKENS.surfaceHigh})`,
] as const
