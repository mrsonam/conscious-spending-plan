import assert from "node:assert/strict"

import { computeAverageMonthlySpending } from "../lib/expense-summary"

assert.equal(computeAverageMonthlySpending([0, 0, 0]), 0)
assert.equal(computeAverageMonthlySpending([1000, 2000, 0, 3000]), 2000)
assert.equal(computeAverageMonthlySpending([500]), 500)

console.log("expense-summary-average.test.ts: ok")
