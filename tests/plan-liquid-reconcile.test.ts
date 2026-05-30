import assert from "node:assert/strict"

import type { CategoryTrackingValue } from "../lib/category-tracking-calculation"
import { sumDeployableBalance } from "../lib/category-tracking-shared"

function emptyRow(overrides: Partial<CategoryTrackingValue> = {}): CategoryTrackingValue {
  return {
    allocated: 0,
    spent: 0,
    transferred: 0,
    income: 0,
    carryover: 0,
    overspending: 0,
    available: 0,
    remaining: 0,
    overspent: 0,
    overspentFromTransfer: 0,
    ...overrides,
  }
}

const tracking = {
  fixedCosts: emptyRow({ available: 100, remaining: 100 }),
  investment: emptyRow({ available: 50, remaining: 50 }),
  guiltFreeSpending: emptyRow({ available: 25, remaining: 25 }),
  savings: emptyRow({ available: 1000, remaining: 1000, spent: 0, transferred: 0 }),
}

assert.equal(sumDeployableBalance(tracking), 1175)

const patched = {
  ...tracking,
  savings: {
    ...tracking.savings,
    available: 1001.47,
    remaining: 1001.47,
  },
}

assert.equal(sumDeployableBalance(patched), 1176.47)

console.log("plan-liquid-reconcile.test.ts: all passed")
