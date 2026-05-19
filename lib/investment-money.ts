import { addMinor, dollarsToMinor, type MinorAmount } from "@/lib/money"
import {
  multiplySharesByPriceMinor,
  parseSharesInput,
  parseSharesOptional,
  type ShareCount,
} from "@/lib/shares"

export function computeHoldingAmountMinor(
  input: {
    amount?: unknown
    numberOfShares?: unknown
    pricePerUnit?: unknown
    brokerageFee?: unknown
  },
  currencyCode: string
): {
  amountMinor: MinorAmount
  pricePerUnitMinor: MinorAmount | null
  brokerageFeeMinor: MinorAmount | null
  numberOfShares: ShareCount | null
} {
  const feeMinor =
    input.brokerageFee != null &&
    input.brokerageFee !== "" &&
    !Number.isNaN(Number(input.brokerageFee))
      ? dollarsToMinor(Number(input.brokerageFee), currencyCode)
      : 0n

  if (input.numberOfShares != null && input.pricePerUnit != null) {
    const shares = parseSharesInput(input.numberOfShares)
    const price = Number(input.pricePerUnit)
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error("Price per unit must be greater than 0")
    }
    const priceMinor = dollarsToMinor(price, currencyCode)
    const lineMinor = multiplySharesByPriceMinor(shares, priceMinor)
    const amountMinor = addMinor(lineMinor, feeMinor > 0n ? feeMinor : 0n)
    return {
      amountMinor,
      pricePerUnitMinor: priceMinor,
      brokerageFeeMinor: feeMinor > 0n ? feeMinor : null,
      numberOfShares: shares,
    }
  }

  if (input.amount != null && input.amount !== "") {
    const amountMinor = dollarsToMinor(Number(input.amount), currencyCode)
    if (amountMinor <= 0n) throw new Error("Amount must be greater than 0")
    const priceMinor =
      input.pricePerUnit != null && input.pricePerUnit !== ""
        ? dollarsToMinor(Number(input.pricePerUnit), currencyCode)
        : null
    const sharesRaw = parseSharesOptional(input.numberOfShares)
    return {
      amountMinor,
      pricePerUnitMinor: priceMinor,
      brokerageFeeMinor: feeMinor > 0n ? feeMinor : null,
      numberOfShares: sharesRaw,
    }
  }

  throw new Error(
    "Either provide amount, or both number of shares and price per unit"
  )
}
