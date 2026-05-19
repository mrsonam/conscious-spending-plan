import { normalizeDisplayCurrency } from "@/lib/display-currency"
import { formatCurrencyAmount } from "@/lib/format-currency"

/** ISO 4217 minor-unit exponent (e.g. USD → 2, JPY → 0). */
const MINOR_UNIT_EXPONENT: Record<string, number> = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  AUD: 2,
  CAD: 2,
  NZD: 2,
  INR: 2,
  NPR: 2,
  JPY: 0,
  CHF: 2,
  CNY: 2,
  HKD: 2,
  SGD: 2,
  MXN: 2,
  BRL: 2,
  ZAR: 2,
}

export type MinorAmount = bigint

export function minorUnitExponent(currencyCode: string): number {
  const code = normalizeDisplayCurrency(currencyCode)
  return MINOR_UNIT_EXPONENT[code] ?? 2
}

export function minorUnitFactor(currencyCode: string): bigint {
  const exp = minorUnitExponent(currencyCode)
  return 10n ** BigInt(exp)
}

/** @deprecated Prefer name `minorUnitFactor` — factor as number for legacy math. */
export function minorUnitFactorNumber(currencyCode: string): number {
  return Number(minorUnitFactor(currencyCode))
}

function normalizeDecimalInput(amount: string | number): string {
  if (typeof amount === "number") {
    if (!Number.isFinite(amount)) throw new Error("Invalid money amount")
    return String(amount)
  }
  const trimmed = amount.trim()
  if (!trimmed || trimmed === "-" || trimmed === ".") {
    throw new Error("Invalid money amount")
  }
  return trimmed
}

/** Round half away from zero to integer minor units. */
export function dollarsToMinor(
  amount: string | number,
  currencyCode: string
): MinorAmount {
  const factor = minorUnitFactor(currencyCode)
  const raw = normalizeDecimalInput(amount)
  const negative = raw.startsWith("-")
  const unsigned = negative ? raw.slice(1) : raw
  const [wholePart = "0", fracPart = ""] = unsigned.split(".")
  const whole = BigInt(wholePart || "0")
  const fracDigits = minorUnitExponent(currencyCode)
  const fracPadded = (fracPart + "0".repeat(fracDigits + 1)).slice(0, fracDigits + 1)
  const fracExact = fracPadded.slice(0, fracDigits)
  const roundDigit = fracPadded[fracDigits] ?? "0"
  let minor = whole * factor + BigInt(fracExact || "0")
  if (roundDigit >= "5") {
    minor += 1n
  }
  return negative ? -minor : minor
}

/** Display-only: convert minor units to a JS number of major units. */
export function minorToDollars(minor: MinorAmount, currencyCode: string): number {
  const factor = minorUnitFactor(currencyCode)
  const negative = minor < 0n
  const abs = negative ? -minor : minor
  const whole = abs / factor
  const rem = abs % factor
  const exp = minorUnitExponent(currencyCode)
  const frac = Number(rem) / Number(factor)
  const major = Number(whole) + frac
  return negative ? -major : major
}

export function formatMinor(minor: MinorAmount, currencyCode: string): string {
  return formatCurrencyAmount(minorToDollars(minor, currencyCode), currencyCode)
}

export function addMinor(...values: MinorAmount[]): MinorAmount {
  return values.reduce((a, b) => a + b, 0n)
}

export function subtractMinor(a: MinorAmount, b: MinorAmount): MinorAmount {
  return a - b
}

export function sumMinor(values: MinorAmount[]): MinorAmount {
  return addMinor(...values)
}

/** Convert legacy float DB value to minor (migration / dual-read). */
export function floatToMinor(
  value: number | null | undefined,
  currencyCode: string
): MinorAmount | null {
  if (value == null) return null
  return dollarsToMinor(String(value), currencyCode)
}

/** Prisma may return bigint; coerce safely. */
export function coerceMinor(value: bigint | number | null | undefined): MinorAmount {
  if (value == null) return 0n
  if (typeof value === "bigint") return value
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value))
  return 0n
}

/** Percentage of a minor amount: `(amount * percent) / 100` rounded half away. */
export function percentOfMinor(
  amountMinor: MinorAmount,
  percent: number
): MinorAmount {
  const basis = BigInt(Math.round(percent * 100))
  const product = amountMinor * basis
  const negative = product < 0n
  const abs = negative ? -product : product
  const rounded = (abs + 5000n) / 10000n
  return negative ? -rounded : rounded
}
