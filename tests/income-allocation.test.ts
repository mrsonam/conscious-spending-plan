import assert from "node:assert/strict"
import type { FundAllocation } from "@prisma/client"

import {
  buildAllocatedSoFarFromEntries,
  computeIncomeAllocationsMinor,
} from "../lib/income-allocation"
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

function alloc(
  amountDollars: number,
  fundAllocation: FundAllocation = plan40202020,
  getAllocated = () => 0n
) {
  return computeIncomeAllocationsMinor(
    income(amountDollars),
    fundAllocation,
    CURRENCY,
    getAllocated
  )
}

function sum(allocResult: ReturnType<typeof alloc>): bigint {
  return (
    allocResult.fixedCosts +
    allocResult.savings +
    allocResult.investment +
    allocResult.guiltFreeSpending
  )
}

// 40/20/20/20 on clean income
{
  const result = alloc(1000)
  assert.equal(result.fixedCosts, income(400))
  assert.equal(result.savings, income(200))
  assert.equal(result.investment, income(200))
  assert.equal(result.guiltFreeSpending, income(200))
  assert.equal(sum(result), income(1000))
}

// Rounding remainder spreads by weight (fixed costs gets extra cent here)
{
  const result = alloc(100.01)
  assert.equal(sum(result), income(100.01))
  assert.equal(result.fixedCosts, income(40.01))
  assert.equal(result.savings, income(20))
  assert.equal(result.investment, income(20))
  assert.equal(result.guiltFreeSpending, income(20))
}

// Investment cap excess redistributes proportionally (not all to savings)
{
  const cappedPlan = {
    ...plan40202020,
    investmentCap: income(150),
  }
  const result = alloc(500, cappedPlan, () => income(100))
  assert.equal(result.investment, income(50))
  assert.equal(result.savings, income(112.5))
  assert.equal(result.guiltFreeSpending, income(112.5))
  assert.equal(result.fixedCosts, income(225))
  assert.equal(sum(result), income(500))
  assert.notEqual(result.savings, income(150))
}

// Savings cap excess does not flow back into savings
{
  const cappedPlan = {
    ...plan40202020,
    savingsCap: income(250),
  }
  const result = alloc(500, cappedPlan, () => income(200))
  assert.equal(result.savings, income(50))
  assert.equal(result.investment, income(112.5))
  assert.equal(result.guiltFreeSpending, income(112.5))
  assert.equal(result.fixedCosts, income(225))
  assert.equal(sum(result), income(500))
}

// Prior entries use stored allocations for cap tracking
{
  const cappedPlan = {
    ...plan40202020,
    investmentCap: income(300),
  }
  const prior = buildAllocatedSoFarFromEntries(
    [
      {
        amount: income(1000),
        allocationFixedCosts: income(400),
        allocationSavings: income(200),
        allocationInvestment: income(200),
        allocationGuiltFreeSpending: income(200),
      },
    ],
    cappedPlan,
    CURRENCY
  )
  assert.equal(prior.investment, income(200))

  const result = alloc(500, cappedPlan, (cat) => prior[cat])
  assert.equal(result.investment, income(100))
  assert.equal(sum(result), income(500))
}

console.log("income-allocation.test.ts: all assertions passed")
