import { TOKENS } from "@/lib/wealth-console-tokens"

/** Splits formatted currency into body (incl. $ and commas) and ".xx" cents for split-decimal display. */
export function currencyDisplayParts(amount: number): {
  main: string
  decimals: string
} {
  const parts = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).formatToParts(amount)
  let main = ""
  let decimals = ""
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]
    if (p.type === "decimal") {
      const frac = parts[i + 1]
      if (frac?.type === "fraction") {
        decimals = `.${frac.value}`
      }
      break
    }
    main += p.value
  }
  return { main, decimals }
}

/** Split-decimal display — main amount at full size, cents ~half. */
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
  const { main, decimals } = currencyDisplayParts(amount)
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
