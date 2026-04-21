"use client"

import type { AppSelectOption } from "@/components/ui/app-select"
import { DISPLAY_CURRENCY_OPTIONS } from "@/lib/display-currency"

function CurrencySelectOptionLabel({
  symbol,
  label,
}: {
  symbol: string
  label: string
}) {
  return (
    <span className="flex min-w-0 items-baseline gap-2">
      <span className="shrink-0 tabular-nums">{symbol}</span>
      <span className="min-w-0 truncate">{label}</span>
    </span>
  )
}

/** AppSelect options: normal currency sign + label text (inherits row color). */
export function buildCurrencySelectOptions(): AppSelectOption[] {
  return DISPLAY_CURRENCY_OPTIONS.map((o) => ({
    value: o.code,
    label: <CurrencySelectOptionLabel symbol={o.symbol} label={o.label} />,
  }))
}
