import { FUND_CATEGORIES, type FundCategory } from "@/lib/fund-allocation-fields"
import type { MinorAmount } from "@/lib/money"

export function isFundCategory(value: string): value is FundCategory {
  return (FUND_CATEGORIES as readonly string[]).includes(value)
}

/** Max movable from a bucket in minor units (headroom, with savings goal pool cap). */
export function computeMaxTransferFromBucketMinor(
  sourceCategory: FundCategory,
  headroomMinor: MinorAmount,
  savingsGeneralMinor?: MinorAmount
): MinorAmount {
  if (headroomMinor <= 0n) return 0n

  if (sourceCategory === "savings" && savingsGeneralMinor != null) {
    return headroomMinor < savingsGeneralMinor ? headroomMinor : savingsGeneralMinor
  }

  return headroomMinor
}
