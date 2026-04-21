import { localeForCurrency, normalizeDisplayCurrency } from "@/lib/display-currency"

/** Splits formatted currency into main symbol/grouping and ".xx" decimals for split display. */
export function currencyDisplayParts(
  amount: number,
  currencyCode: string
): { main: string; decimals: string } {
  const c = normalizeDisplayCurrency(currencyCode)
  const parts = new Intl.NumberFormat(localeForCurrency(c), {
    style: "currency",
    currency: c,
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
