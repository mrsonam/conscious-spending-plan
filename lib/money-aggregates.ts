import { serializeMoneyForApi } from "@/lib/money-api"
import { minorToDollars, type MinorAmount } from "@/lib/money"

/** Convert Prisma aggregate sum (minor) to dollars for API/analytics. */
export function minorSumToDollars(
  sum: MinorAmount | bigint | null | undefined,
  currencyCode: string
): number {
  return serializeMoneyForApi(sum ?? 0n, currencyCode)
}

export function minorToNumber(
  minor: MinorAmount | bigint,
  currencyCode: string
): number {
  return minorToDollars(minor, currencyCode)
}
