import { addMinor, coerceMinor } from "@/lib/money"
import { serializeMoneyForApi } from "@/lib/money-api"

export function sumAmountMinor(
  rows: Array<{ amount: bigint }>
): bigint {
  return rows.reduce((s, r) => addMinor(s, coerceMinor(r.amount)), 0n)
}

export function toApiMoney(minor: bigint, currencyCode: string): number {
  return serializeMoneyForApi(minor, currencyCode)
}
