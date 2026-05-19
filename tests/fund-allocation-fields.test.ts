import assert from "node:assert/strict"
import type { FundAllocation } from "@prisma/client"

import {
  applyFundCategoryValueFromApi,
  fundCategoryDisplayValue,
  fundCategoryFixedMinor,
} from "../lib/fund-allocation-fields"
import { fundAllocationFromApi, fundAllocationToApi } from "../lib/fund-allocation-money"

const baseRow = {
  id: "fa1",
  userId: "u1",
  fixedCostsType: "percentage",
  fixedCostsPercentBps: 5000,
  fixedCostsFixedMinor: null,
  fixedCostsCap: null,
  savingsType: "percentage",
  savingsPercentBps: 2000,
  savingsFixedMinor: null,
  savingsCap: null,
  investmentType: "fixed",
  investmentPercentBps: 1000,
  investmentFixedMinor: 5000n,
  investmentCap: null,
  guiltFreeSpendingType: "percentage",
  guiltFreeSpendingPercentBps: 2000,
  guiltFreeSpendingFixedMinor: null,
  guiltFreeSpendingCap: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} satisfies FundAllocation

assert.equal(fundCategoryDisplayValue(baseRow, "fixedCosts", "USD"), 50)
assert.equal(fundCategoryDisplayValue(baseRow, "investment", "USD"), 50)
assert.equal(fundCategoryFixedMinor(baseRow, "investment"), 5000n)

const api = fundAllocationToApi(baseRow, "USD") as Record<string, unknown>
assert.equal(api.fixedCostsValue, 50)
assert.equal(api.investmentValue, 50)

const parsed = fundAllocationFromApi(
  {
    ...api,
    savingsType: "fixed",
    savingsValue: 25.5,
  },
  "USD"
)
assert.equal(parsed.savingsType, "fixed")
assert.equal(parsed.savingsFixedMinor, 2550n)
assert.equal((parsed as Record<string, unknown>).savingsValue, undefined)

console.log("fund-allocation-fields.test.ts: all assertions passed")
