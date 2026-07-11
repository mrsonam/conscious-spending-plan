import type { ExpenseCategoryAggregate } from "@/lib/expense-page-types"

/**
 * Sentinel key for the synthetic "rest of the categories" bucket. Deliberately
 * distinct from every real `expenseCategory` value (which includes a
 * genuine, user-selectable "other" category — see lib/expense-page-constants.ts)
 * so the two never collide in lookups, keys, or click handlers.
 */
export const OTHER_BUCKET_CATEGORY = "__other_categories__"

/**
 * Splits a rank-sorted (desc by amount) category list into the visible top N
 * and a rolled-up "Other" total for everything beyond it.
 */
export function bucketTopCategories(
  ranked: ExpenseCategoryAggregate[],
  topN: number,
): { visible: ExpenseCategoryAggregate[]; otherAmount: number; otherCount: number } {
  const visible = ranked.slice(0, topN)
  const rest = ranked.slice(topN)
  return {
    visible,
    otherAmount: rest.reduce((sum, category) => sum + category.amount, 0),
    otherCount: rest.reduce((sum, category) => sum + category.count, 0),
  }
}
