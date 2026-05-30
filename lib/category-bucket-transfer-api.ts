import type { FundCategory } from "@/lib/fund-allocation-fields"
import { isFundCategory } from "@/lib/category-bucket-transfer-shared"
import { ensureCategoryBucketTransferTable } from "@/lib/ensure-category-bucket-transfer-table"
import { isMissingCategoryBucketTransferTable } from "@/lib/ensure-category-bucket-transfer-table"
import { serializeMoneyForApi } from "@/lib/money-api"
import { prisma } from "@/lib/prisma"

export type CategoryBucketTransferApiRow = {
  id: string
  fromCategory: FundCategory
  toCategory: FundCategory
  amount: number
  createdAt: string
}

export async function listCategoryBucketTransfersForMonth(
  userId: string,
  month: number,
  year: number,
  currency: string
): Promise<CategoryBucketTransferApiRow[]> {
  await ensureCategoryBucketTransferTable()

  try {
    const rows = await prisma.categoryBucketTransfer.findMany({
      where: { userId, month, year },
      orderBy: [{ createdAt: "desc" }],
    })

    const out: CategoryBucketTransferApiRow[] = []
    for (const row of rows) {
      if (!isFundCategory(row.fromCategory) || !isFundCategory(row.toCategory)) {
        continue
      }
      out.push({
        id: row.id,
        fromCategory: row.fromCategory,
        toCategory: row.toCategory,
        amount: serializeMoneyForApi(row.amount, currency),
        createdAt: row.createdAt.toISOString(),
      })
    }
    return out
  } catch (error) {
    if (isMissingCategoryBucketTransferTable(error)) {
      return []
    }
    throw error
  }
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
