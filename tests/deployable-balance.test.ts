import assert from "node:assert/strict"

import {
  netPillarHeadroom,
  reconcileTrackingDisplayToLiquid,
  sumDeployableBalance,
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
assert.equal(savingsSpendableAmount(savingsRow, 0, 40), 40)
assert.equal(savingsSpendableAmount(savingsRow, 10, 30), 30)
assert.equal(
  sumDeployableBalance(tracking, 40),
  250 - 100 + 40
)
assert.equal(
  sumDeployableBalance(tracking, 30, 10),
  250 - 100 + 30
)

const liquid = 1170
const reconciled = reconcileTrackingDisplayToLiquid(tracking, liquid)
assert.equal(sumDeployableBalance(reconciled, 40), liquid)

console.log("deployable-balance.test.ts: all passed")
