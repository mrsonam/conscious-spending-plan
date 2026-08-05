import { createElement } from "react"
import { cn } from "@/lib/utils"
import { TOKENS } from "@/lib/wealth-console-tokens"
import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "@/lib/income-page-types"
import { consoleFocus } from "@/components/wealth-console/console-ui"

/** Console text field / select trigger on investment surfaces. */
export const investmentConsoleField = cn(
  "mt-1 w-full rounded-xl border px-3 py-2.5 text-sm tabular-nums transition-[box-shadow] [color-scheme:dark]",
  consoleFocus,
)

export const investmentFieldLabelClass =
  "text-[10px] font-semibold uppercase tracking-wider"

export const investmentConsoleButtonClass = cn(
  "transition-[background-color,transform] duration-150 hover:bg-white/6 active:scale-[0.97] disabled:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100",
  consoleFocus,
)

export const INVESTMENTS_PANEL_TABS_ID = "investments-panel-tabs"

/** Inline P/L percent chip next to portfolio hero figure. */
export function investmentPlBadgeStyle(positive: boolean) {
  return positive
    ? {
        borderColor: TOKENS.primary,
        color: TOKENS.primary,
        background: `color-mix(in srgb, ${TOKENS.primary} 12%, transparent)`,
      }
    : {
        borderColor: ERROR_SOFT,
        color: ERROR_SOFT,
        background: `color-mix(in srgb, ${ERROR_SOFT} 14%, transparent)`,
      }
}

export const investmentSleeveActionClass = cn(
  "mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] transition-transform duration-150 hover:bg-white/6 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100",
  consoleFocus,
)

export function investmentFieldErrorId(controlId: string) {
  return `${controlId}-error`
}

type InvestmentFieldInlineErrorProps = {
  controlId: string
  message?: string
}

export function InvestmentFieldInlineError({
  controlId,
  message,
}: InvestmentFieldInlineErrorProps) {
  if (!message) return null
  return createElement(
    "p",
    {
      id: investmentFieldErrorId(controlId),
      role: "alert",
      className: "mt-1 text-xs leading-snug",
      style: { color: ERROR_SOFT },
    },
    message,
  )
}

export function investmentFieldAria(controlId: string, message?: string) {
  if (!message) return {}
  const errorId = investmentFieldErrorId(controlId)
  return {
    "aria-invalid": true as const,
    "aria-describedby": errorId,
  }
}
