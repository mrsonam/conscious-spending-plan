import assert from "node:assert/strict"

import { computeMaxTransferFromBucketMinor } from "../lib/category-bucket-transfer-shared"

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

console.log("category-bucket-transfer.test.ts: all assertions passed")
