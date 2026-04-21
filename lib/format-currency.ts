import { localeForCurrency, normalizeDisplayCurrency } from "@/lib/display-currency"

export function formatCurrencyAmount(amount: number, currencyCode: string): string {
  const c = normalizeDisplayCurrency(currencyCode)
  return new Intl.NumberFormat(localeForCurrency(c), {
    style: "currency",
    currency: c,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
