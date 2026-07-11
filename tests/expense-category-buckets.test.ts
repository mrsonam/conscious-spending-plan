import assert from "node:assert/strict"
import { bucketTopCategories } from "../lib/expense-category-buckets"
import type { ExpenseCategoryAggregate } from "../lib/expense-page-types"

function category(
  label: string,
  amount: number,
  count = 1,
): ExpenseCategoryAggregate {
  return {
    category: label.toLowerCase(),
    label,
    amount,
    count,
    sharePct: 0,
    averageAmount: count > 0 ? amount / count : 0,
    momentumPct: null,
    previousAmount: 0,
  }
}

void (async () => {
  const ranked = [
    category("Groceries", 500, 5),
    category("Rent", 400, 1),
    category("Fuel", 100, 3),
    category("Dining", 50, 2),
    category("Gym", 40, 1),
    category("Misc", 30, 2),
    category("Tip", 20, 1),
  ]

  const bucketed = bucketTopCategories(ranked, 5)
  assert.equal(bucketed.visible.length, 5)
  assert.deepEqual(
    bucketed.visible.map((c) => c.label),
    ["Groceries", "Rent", "Fuel", "Dining", "Gym"],
  )
  assert.equal(bucketed.otherAmount, 50) // Misc 30 + Tip 20
  assert.equal(bucketed.otherCount, 3) // 2 + 1

  const underThreshold = bucketTopCategories(
    [category("A", 10), category("B", 5)],
    5,
  )
  assert.equal(underThreshold.visible.length, 2)
  assert.equal(underThreshold.otherAmount, 0)
  assert.equal(underThreshold.otherCount, 0)

  const empty = bucketTopCategories([], 5)
  assert.equal(empty.visible.length, 0)
  assert.equal(empty.otherAmount, 0)
  assert.equal(empty.otherCount, 0)

  console.log("expense-category-buckets.test.ts: all passed")
})()
