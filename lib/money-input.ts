import { dollarsToMinor, minorToDollars } from "@/lib/money"

/** Parse a user-entered dollar string/number and return a rounded dollar amount for API JSON. */
export function parseMoneyInput(
  value: string | number,
  currencyCode: string
): number {
  return minorToDollars(dollarsToMinor(value, currencyCode), currencyCode)
}

/** Like parseMoneyInput but returns null when the input is empty or invalid. */
export function tryParseMoneyInput(
  value: string,
  currencyCode: string
): number | null {
  const trimmed = value.trim()
  if (!trimmed || trimmed === ".") return null
  try {
    const dollars = parseMoneyInput(trimmed, currencyCode)
    return Number.isFinite(dollars) ? dollars : null
  } catch {
    return null
  }
}

/** Fund allocation value: percent stays float; fixed uses minor-unit rounding. */
export function parsePercentOrMoneyInput(
  value: string,
  mode: "percentage" | "fixed",
  currencyCode: string
): number | null {
  if (value === "" || value === ".") return 0
  if (mode === "percentage") {
    const n = parseFloat(value)
    return Number.isNaN(n) ? null : n
  }
  return tryParseMoneyInput(value, currencyCode)
}
