import assert from "node:assert/strict"
import type { FundAllocation } from "@prisma/client"

import { computeMonthIncomeReallocations } from "../lib/reallocate-month-income"
import { dollarsToMinor } from "../lib/money"

const CURRENCY = "USD"

const plan40202020 = {
  id: "fa1",
  userId: "u1",
  fixedCostsType: "percentage",
  fixedCostsPercentBps: 4000,
  fixedCostsFixedMinor: null,
  fixedCostsCap: null,
  savingsType: "percentage",
  savingsPercentBps: 2000,
  savingsFixedMinor: null,
  savingsCap: null,
  investmentType: "percentage",
  investmentPercentBps: 2000,
  investmentFixedMinor: null,
  investmentCap: null,
  guiltFreeSpendingType: "percentage",
  guiltFreeSpendingPercentBps: 2000,
  guiltFreeSpendingFixedMinor: null,
  guiltFreeSpendingCap: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} satisfies FundAllocation

function income(dollars: number): bigint {
  return dollarsToMinor(dollars, CURRENCY)
}

const { reallocations, incomeTotals } = computeMonthIncomeReallocations(
  [
    { id: "e1", amount: income(1000) },
    { id: "e2", amount: income(500) },
  ],
  plan40202020,
  CURRENCY,
)

assert.equal(reallocations.length, 2)
assert.equal(reallocations[0]?.entryId, "e1")
assert.equal(reallocations[0]?.alloc.fixedCosts, income(400))
assert.equal(reallocations[1]?.alloc.fixedCosts, income(200))
assert.equal(incomeTotals.fixedCosts, income(600))
assert.equal(incomeTotals.savings, income(300))
assert.equal(incomeTotals.investment, income(300))
assert.equal(incomeTotals.guiltFreeSpending, income(300))

console.log("reallocate-month-income.test.ts: all assertions passed")
