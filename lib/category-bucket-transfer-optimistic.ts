import type { CategoryBucketTransferApiRow } from "@/lib/category-bucket-transfer-api"
import type { CategoryTrackingRow } from "@/lib/category-tracking-shared"
import type { FundCategory } from "@/lib/fund-allocation-fields"

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function createOptimisticBucketTransferId(): string {
  return `optimistic-${crypto.randomUUID()}`
}

function adjustTrackingRowForEnvelopeDelta(
  row: CategoryTrackingRow,
  delta: number,
  category: FundCategory
): CategoryTrackingRow {
  const allocated = round2(row.allocated + delta)
  const available = round2(row.available + delta)

  const rawRemaining =
    category === "investment"
      ? available - row.transferred
      : available - row.spent - row.transferred

  const overspentTotal = rawRemaining < 0 ? Math.abs(rawRemaining) : 0
  const overspentFromTransfer =
    category !== "investment" && overspentTotal > 0
      ? Math.min(row.transferred, overspentTotal)
      : 0

  return {
    ...row,
    allocated,
    available,
    remaining: round2(Math.max(0, rawRemaining)),
    overspent: round2(overspentTotal),
    overspentFromTransfer: round2(overspentFromTransfer),
  }
}

export function applyOptimisticBucketTransfer(params: {
  tracking: Record<string, CategoryTrackingRow>
  bucketTransfers: CategoryBucketTransferApiRow[]
  fromCategory: FundCategory
  toCategory: FundCategory
  amount: number
  optimisticId: string
  createdAt?: string
}): {
  tracking: Record<string, CategoryTrackingRow>
  bucketTransfers: CategoryBucketTransferApiRow[]
} {
  const {
    tracking,
    bucketTransfers,
    fromCategory,
    toCategory,
    amount,
    optimisticId,
    createdAt,
  } = params

  const fromRow = tracking[fromCategory]
  const toRow = tracking[toCategory]
  if (!fromRow || !toRow) {
    return { tracking, bucketTransfers }
  }

  return {
    tracking: {
      ...tracking,
      [fromCategory]: adjustTrackingRowForEnvelopeDelta(fromRow, -amount, fromCategory),
      [toCategory]: adjustTrackingRowForEnvelopeDelta(toRow, amount, toCategory),
    },
    bucketTransfers: [
      {
        id: optimisticId,
        fromCategory,
        toCategory,
        amount,
        createdAt: createdAt ?? new Date().toISOString(),
      },
      ...bucketTransfers,
    ],
  }
}

export function cloneCategoryTrackingState(
  tracking: Record<string, CategoryTrackingRow> | null,
  bucketTransfers: CategoryBucketTransferApiRow[],
  savingsGeneralAvailable: number
) {
  return {
    tracking: tracking
      ? (Object.fromEntries(
          Object.entries(tracking).map(([key, row]) => [key, { ...row }])
        ) as Record<string, CategoryTrackingRow>)
      : null,
    bucketTransfers: bucketTransfers.map((row) => ({ ...row })),
    savingsGeneralAvailable,
  }
}

export function applyOptimisticSavingsGeneralDelta(
  savingsGeneralAvailable: number,
  fromCategory: FundCategory,
  amount: number
): number {
  if (fromCategory !== "savings") return savingsGeneralAvailable
  return round2(Math.max(0, savingsGeneralAvailable - amount))
}
