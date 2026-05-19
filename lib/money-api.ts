import {
  coerceMinor,
  dollarsToMinor,
  minorToDollars,
  type MinorAmount,
} from "@/lib/money"
import { normalizeDisplayCurrency } from "@/lib/display-currency"

/** Parse API/client dollar input to minor units. */
export function parseMoneyFromApi(
  value: unknown,
  currencyCode: string
): MinorAmount {
  if (typeof value === "bigint") return value
  if (typeof value === "string" && value.trim() !== "") {
    return dollarsToMinor(value, currencyCode)
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return dollarsToMinor(value, currencyCode)
  }
  throw new Error("Invalid money amount")
}

/** Serialize DB minor for JSON responses (dollars as number for client compat). */
export function serializeMoneyForApi(
  minor: MinorAmount | bigint | number | null | undefined,
  currencyCode: string
): number {
  return minorToDollars(coerceMinor(minor), currencyCode)
}

/** Optional explicit minor string in API (future clients). */
export function serializeMoneyMinorString(
  minor: MinorAmount | bigint | null | undefined
): string {
  return coerceMinor(minor).toString()
}

export function withCurrencyFromSession(
  displayCurrency: unknown
): string {
  return normalizeDisplayCurrency(displayCurrency)
}
