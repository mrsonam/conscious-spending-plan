import assert from "node:assert/strict"

import {
  netPillarHeadroom,
  reconcileTrackingDisplayToLiquid,
  sumDeployableBalance,
  savingsDisplayBreakdown,
  savingsSpendableAmount,
  type CategoryTrackingRow,
} from "../lib/category-tracking-shared"

const base: CategoryTrackingRow = {
  allocated: 100,
  spent: 50,
  transferred: 0,
  income: 0,
  carryover: 0,
  overspending: 0,
  available: 100,
  remaining: 50,
  overspent: 0,
}

assert.equal(netPillarHeadroom({ remaining: 50, overspent: 0 }), 50)
assert.equal(netPillarHeadroom({ remaining: 0, overspent: 75 }), -75)

const tracking = {
  fixedCosts: { ...base, remaining: 200, overspent: 0 },
  investment: { ...base, remaining: 0, overspent: 50 },
  savings: { ...base, remaining: 100, overspent: 0 },
  guiltFreeSpending: { ...base, remaining: 0, overspent: 0 },
}

assert.equal(sumDeployableBalance(tracking), 250)

const savingsRow = tracking.savings!
assert.equal(savingsSpendableAmount(savingsRow, 0), 100)
assert.equal(savingsSpendableAmount(savingsRow, 10), 90)

const residualRow: CategoryTrackingRow = {
  ...base,
  remaining: 23336.78,
  displayRemaining: 23326.68,
}
const breakdown = savingsDisplayBreakdown(residualRow, 17754.26)
assert.equal(breakdown.total, 23326.68)
assert.equal(breakdown.spendable, 5572.42)
assert.equal(breakdown.inGoals, 17754.26)
assert.equal(breakdown.total, breakdown.spendable + breakdown.inGoals)

assert.equal(sumDeployableBalance(tracking, undefined, 10), 250 - 100 + 90)

const liquid = 1170
const reconciled = reconcileTrackingDisplayToLiquid(tracking, liquid)
assert.equal(sumDeployableBalance(reconciled), liquid)

const after = savingsDisplayBreakdown(reconciled.savings!, 40)
assert.equal(after.total, reconciled.savings!.displayRemaining)
assert.equal(after.total, after.spendable + after.inGoals)

console.log("deployable-balance.test.ts: all passed")
