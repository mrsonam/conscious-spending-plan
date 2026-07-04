import { dollarsToMinor, type MinorAmount } from "@/lib/money"

const SHARES_PATTERN = /^\d+(\.\d+)?$/

/** Canonical share count string (no Prisma / Node-only deps, safe for client bundles). */
export type ShareCount = string

function parseSharesScaled(
  s: string,
  options?: { allowZero?: boolean },
): { scaled: bigint; scale: number } {
  const [intPart, frac = ""] = s.split(".")
  const scale = frac.length
  const scaled = BigInt(intPart + frac)
  if (!options?.allowZero && scaled <= 0n) {
    throw new Error("Number of shares must be greater than 0")
  }
  return { scaled, scale }
}

function formatScaledShares(scaled: bigint, scale: number): ShareCount {
  if (scale === 0) return scaled.toString()
  const digits = scaled.toString()
  const padded =
    digits.length <= scale
      ? digits.padStart(scale + 1, "0")
      : digits
  const intLen = padded.length - scale
  const intPart = padded.slice(0, intLen)
  const fracPart = padded.slice(intLen).replace(/0+$/, "")
  return fracPart ? `${intPart}.${fracPart}` : intPart
}

/** Normalize stored/API share values; allows zero (unlike user input validation). */
function sharesFromUnknown(value: unknown): ShareCount | null {
  if (value == null || value === "") return null

  let raw: string
  if (typeof value === "string") {
    raw = value.trim()
  } else if (typeof value === "object" && value !== null) {
    const maybe = value as { toFixed?: (dp?: number) => string }
    raw =
      typeof maybe.toFixed === "function"
        ? maybe.toFixed().trim()
        : String(value).trim()
  } else {
    raw = String(value).trim()
  }

  if (!raw) return null
  if (!SHARES_PATTERN.test(raw)) return null

  const { scaled, scale } = parseSharesScaled(raw, { allowZero: true })
  return formatScaledShares(scaled, scale)
}

/** Validate and canonicalize a share count string for storage. */
export function parseSharesInput(value: unknown): ShareCount {
  if (value == null || value === "") {
    throw new Error("Number of shares is required")
  }
  const trimmed = String(value).trim()
  if (!SHARES_PATTERN.test(trimmed)) {
    throw new Error("Enter a valid share count")
  }
  const { scaled, scale } = parseSharesScaled(trimmed)
  return formatScaledShares(scaled, scale)
}

export function parseSharesOptional(value: unknown): ShareCount | null {
  if (value == null || value === "") return null
  return parseSharesInput(value)
}

export function sharesToApiString(value: unknown): string | null {
  return sharesFromUnknown(value)
}

export function addShares(
  a: unknown,
  b: unknown,
): ShareCount {
  const left = sharesFromUnknown(a) ?? "0"
  const right = sharesFromUnknown(b) ?? "0"
  const aParsed = parseSharesScaled(left, { allowZero: true })
  const bParsed = parseSharesScaled(right, { allowZero: true })
  const scale = Math.max(aParsed.scale, bParsed.scale)
  const aScaled = aParsed.scaled * 10n ** BigInt(scale - aParsed.scale)
  const bScaled = bParsed.scaled * 10n ** BigInt(scale - bParsed.scale)
  return formatScaledShares(aScaled + bScaled, scale)
}

export function compareShares(a: unknown, b: unknown): number {
  const left = sharesFromUnknown(a) ?? "0"
  const right = sharesFromUnknown(b) ?? "0"
  const aParsed = parseSharesScaled(left, { allowZero: true })
  const bParsed = parseSharesScaled(right, { allowZero: true })
  const scale = Math.max(aParsed.scale, bParsed.scale)
  const aScaled = aParsed.scaled * 10n ** BigInt(scale - aParsed.scale)
  const bScaled = bParsed.scaled * 10n ** BigInt(scale - bParsed.scale)
  if (aScaled === bScaled) return 0
  return aScaled > bScaled ? 1 : -1
}

/** Round half away: shares × priceMinor → line amount in minor units. */
export function multiplySharesByPriceMinor(
  shares: ShareCount,
  priceMinor: MinorAmount,
): MinorAmount {
  const { scaled, scale } = parseSharesScaled(shares)
  const numerator = scaled * priceMinor
  const divisor = 10n ** BigInt(scale)
  return (numerator + divisor / 2n) / divisor
}

/** shares × price (dollars) → minor, for legacy amount-only paths. */
export function multiplySharesByPriceDollars(
  shares: ShareCount,
  priceDollars: number,
  currencyCode: string,
): MinorAmount {
  const lineDollars = Number(shares) * priceDollars
  if (!Number.isFinite(lineDollars)) {
    throw new Error("Invalid share count or price")
  }
  return dollarsToMinor(lineDollars, currencyCode)
}
