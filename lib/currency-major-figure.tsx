"use client"

import { useFormatCurrency } from "@/hooks/use-format-currency"
import { currencyDisplayParts } from "@/lib/currency-display-parts"
import { TOKENS } from "@/lib/wealth-console-tokens"

export type MajorFigureVariant = "income" | "prosperity" | "loss" | "neutral"

export function MajorFigureCurrency({
  amount,
  variant,
  className,
  decimalEm = 0.5,
  colorMain,
  colorDecimal,
}: {
  amount: number
  variant: MajorFigureVariant
  className?: string
  decimalEm?: number
  colorMain?: string
  colorDecimal?: string
}) {
  const { currencyCode } = useFormatCurrency()
  const { main, decimals } = currencyDisplayParts(amount, currencyCode)
  const error = "#ffb4ab"
  let mainColor: string
  let decColor: string
  switch (variant) {
    case "income":
      mainColor = TOKENS.onSurface
      decColor = TOKENS.primary
      break
    case "prosperity":
      mainColor = TOKENS.primary
      decColor = TOKENS.primary
      break
    case "loss":
      mainColor = error
      decColor = error
      break
    case "neutral":
      mainColor = TOKENS.onSurface
      decColor = TOKENS.onSurfaceMuted
      break
  }
  if (colorMain) mainColor = colorMain
  if (colorDecimal) decColor = colorDecimal

  return (
    <span
      className={`inline-flex items-baseline font-black tabular-nums tracking-tight ${className ?? ""}`}
    >
      <span style={{ color: mainColor }}>{main}</span>
      {decimals ? (
        <span
          className="inline-block align-baseline"
          style={{
            color: decColor,
            fontSize: `${decimalEm}em`,
            lineHeight: 1,
            marginLeft: "0.03em",
            letterSpacing: "-0.02em",
          }}
        >
          {decimals}
        </span>
      ) : null}
    </span>
  )
}
