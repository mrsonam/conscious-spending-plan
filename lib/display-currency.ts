export const DEFAULT_DISPLAY_CURRENCY = "AUD"

export type DisplayCurrencyOption = {
  code: string
  label: string
  /** Short glyph for UI (symbol / localized sign), shown in select rows. */
  symbol: string
}

/** Options for display currency select, `label` leads with ISO code for quick scanning. */
export const DISPLAY_CURRENCY_OPTIONS: DisplayCurrencyOption[] = [
  { code: "USD", label: "USD: US dollar", symbol: "$" },
  { code: "EUR", label: "EUR: Euro", symbol: "€" },
  { code: "GBP", label: "GBP: British pound", symbol: "£" },
  { code: "AUD", label: "AUD: Australian dollar", symbol: "A$" },
  { code: "CAD", label: "CAD: Canadian dollar", symbol: "C$" },
  { code: "NZD", label: "NZD: New Zealand dollar", symbol: "NZ$" },
  { code: "INR", label: "INR: Indian rupee", symbol: "₹" },
  { code: "NPR", label: "NPR: Nepalese rupee", symbol: "रू" },
  { code: "JPY", label: "JPY: Japanese yen", symbol: "¥" },
  { code: "CHF", label: "CHF: Swiss franc", symbol: "Fr" },
  { code: "CNY", label: "CNY: Chinese yuan", symbol: "元" },
  { code: "HKD", label: "HKD: Hong Kong dollar", symbol: "HK$" },
  { code: "SGD", label: "SGD: Singapore dollar", symbol: "S$" },
  { code: "MXN", label: "MXN: Mexican peso", symbol: "MX$" },
  { code: "BRL", label: "BRL: Brazilian real", symbol: "R$" },
  { code: "ZAR", label: "ZAR: South African rand", symbol: "R" },
]

const ALLOWED = new Set(DISPLAY_CURRENCY_OPTIONS.map((o) => o.code))

export function isValidDisplayCurrency(code: unknown): code is string {
  return typeof code === "string" && ALLOWED.has(code)
}

export function normalizeDisplayCurrency(code: unknown): string {
  if (typeof code === "string" && ALLOWED.has(code)) return code
  return DEFAULT_DISPLAY_CURRENCY
}

/** BCP 47 locale for `Intl.NumberFormat` so grouping/symbols match the currency. */
export function localeForCurrency(currencyCode: string): string {
  switch (currencyCode) {
    case "EUR":
      return "de-DE"
    case "GBP":
      return "en-GB"
    case "AUD":
    case "NZD":
      return "en-AU"
    case "CAD":
      return "en-CA"
    case "INR":
      return "en-IN"
    case "NPR":
      return "en-NP"
    case "JPY":
      return "ja-JP"
    case "CHF":
      return "de-CH"
    case "CNY":
      return "zh-CN"
    case "HKD":
      return "en-HK"
    case "SGD":
      return "en-SG"
    case "MXN":
      return "es-MX"
    case "BRL":
      return "pt-BR"
    case "ZAR":
      return "en-ZA"
    default:
      return "en-US"
  }
}
