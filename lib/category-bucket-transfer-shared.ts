import { FUND_CATEGORIES, type FundCategory } from "@/lib/fund-allocation-fields"
import type { MinorAmount } from "@/lib/money"

export function isFundCategory(value: string): value is FundCategory {
  return (FUND_CATEGORIES as readonly string[]).includes(value)
}

export type CategoryBucketTransferApiRow = {
  id: string
  fromCategory: FundCategory
  toCategory: FundCategory
  amount: number
  createdAt: string
}

export type BucketTransferFlow = { in: number; out: number }

export function bucketTransferFlowByCategory(
  transfers: CategoryBucketTransferApiRow[]
): Record<FundCategory, BucketTransferFlow> {
  const flow = Object.fromEntries(
    (["fixedCosts", "savings", "investment", "guiltFreeSpending"] as FundCategory[]).map(
      (cat) => [cat, { in: 0, out: 0 }]
    )
  ) as Record<FundCategory, BucketTransferFlow>

  for (const t of transfers) {
    flow[t.fromCategory].out += t.amount
    flow[t.toCategory].in += t.amount
  }

  for (const cat of Object.keys(flow) as FundCategory[]) {
    flow[cat].in = Math.round(flow[cat].in * 100) / 100
    flow[cat].out = Math.round(flow[cat].out * 100) / 100
  }

  return flow
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
