import assert from "node:assert/strict"

import { computeMaxTransferFromBucketMinor } from "../lib/category-bucket-transfer-shared"
import {
  applyOptimisticBucketTransfer,
  applyOptimisticSavingsGeneralDelta,
} from "../lib/category-bucket-transfer-optimistic"

assert.equal(computeMaxTransferFromBucketMinor("fixedCosts", 5000n), 5000n)
assert.equal(computeMaxTransferFromBucketMinor("fixedCosts", 0n), 0n)
assert.equal(
  computeMaxTransferFromBucketMinor("savings", 8000n, 6000n),
  6000n,
  "savings capped by general pool after goals"
)
assert.equal(
  computeMaxTransferFromBucketMinor("savings", 4000n, 6000n),
  4000n,
  "savings capped by headroom when lower than general pool"
)
assert.equal(
  computeMaxTransferFromBucketMinor("savings", 8000n, 0n),
  0n,
  "savings blocked when goals consume envelope"
)

const baseRow = {
  allocated: 500,
  spent: 100,
  transferred: 0,
  income: 0,
  carryover: 0,
  overspending: 0,
  available: 500,
  remaining: 400,
  overspent: 0,
}

const optimistic = applyOptimisticBucketTransfer({
  tracking: {
    savings: { ...baseRow },
    guiltFreeSpending: { ...baseRow, allocated: 200, available: 200, remaining: 200, spent: 0 },
  },
  bucketTransfers: [],
  fromCategory: "savings",
  toCategory: "guiltFreeSpending",
  amount: 50,
  optimisticId: "optimistic-test",
})

assert.equal(optimistic.tracking.savings.remaining, 350)
assert.equal(optimistic.tracking.guiltFreeSpending.remaining, 250)
assert.equal(optimistic.bucketTransfers.length, 1)
assert.equal(optimistic.bucketTransfers[0]?.amount, 50)
assert.equal(
  applyOptimisticSavingsGeneralDelta(120, "savings", 50),
  70,
  "general savings pool drops when savings is source"
)
assert.equal(
  applyOptimisticSavingsGeneralDelta(120, "fixedCosts", 50),
  120,
  "general savings pool unchanged for non-savings source"
)

console.log("category-bucket-transfer.test.ts: all assertions passed")
