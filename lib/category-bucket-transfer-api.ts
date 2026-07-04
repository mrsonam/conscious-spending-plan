import type { FundCategory } from "@/lib/fund-allocation-fields"
import {
  isFundCategory,
  type CategoryBucketTransferApiRow,
} from "@/lib/category-bucket-transfer-shared"
import { isMissingCategoryBucketTransferTable } from "@/lib/ensure-category-bucket-transfer-table"
import { serializeMoneyForApi } from "@/lib/money-api"
import { prisma } from "@/lib/prisma"

export type { CategoryBucketTransferApiRow, BucketTransferFlow } from "@/lib/category-bucket-transfer-shared"
export { bucketTransferFlowByCategory } from "@/lib/category-bucket-transfer-shared"

export async function listCategoryBucketTransfersForMonth(
  userId: string,
  month: number,
  year: number,
  currency: string
): Promise<CategoryBucketTransferApiRow[]> {
  // Read path: never run DDL here, ensure runs on transfer writes only.
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
        fromCategory: row.fromCategory as FundCategory,
        toCategory: row.toCategory as FundCategory,
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
