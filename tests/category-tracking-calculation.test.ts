import assert from "node:assert/strict"

import {
  calculateCategoryTracking,
  calculateMonthClosing,
} from "../lib/category-tracking-calculation"

const categories = ["fixedCosts", "investment", "guiltFreeSpending", "savings"] as const

const emptyPrevious = () =>
  Object.fromEntries(categories.map((category) => [category, 0])) as Record<string, number>

const tracking = calculateCategoryTracking({
  categoryBalances: [{ category: "investment", balance: 1_000 }],
  expenses: [],
  transfers: [{ category: "investment", amount: 1_000 }],
  investments: [{ amount: 1_000 }],
  carryoverByCategory: emptyPrevious(),
  overspentByCategory: emptyPrevious(),
})

assert.equal(tracking.investment.spent, 1_000)
assert.equal(tracking.investment.transferred, 1_000)
assert.equal(tracking.investment.remaining, 0)
assert.equal(tracking.investment.overspent, 0)

const holdingOnly = calculateCategoryTracking({
  categoryBalances: [{ category: "investment", balance: 1_000 }],
  expenses: [{ category: "investment", amount: 500 }],
  transfers: [],
  investments: [{ amount: 1_000 }],
  carryoverByCategory: emptyPrevious(),
  overspentByCategory: emptyPrevious(),
})

assert.equal(holdingOnly.investment.spent, 0)
assert.equal(holdingOnly.investment.transferred, 0)
assert.equal(holdingOnly.investment.remaining, 1_000)

const transferOnly = calculateCategoryTracking({
  categoryBalances: [{ category: "investment", balance: 1_000 }],
  expenses: [],
  transfers: [{ category: "investment", amount: 400 }],
  investments: [{ amount: 1_000 }],
  carryoverByCategory: emptyPrevious(),
  overspentByCategory: emptyPrevious(),
})

assert.equal(transferOnly.investment.spent, 400)
assert.equal(transferOnly.investment.transferred, 400)
assert.equal(transferOnly.investment.remaining, 600)

const trackingWithIncomeAlloc = calculateCategoryTracking({
  categoryBalances: [{ category: "investment", balance: 1_500 }],
  expenses: [],
  transfers: [],
  investments: [],
  carryoverByCategory: { ...emptyPrevious(), investment: 500 },
  overspentByCategory: emptyPrevious(),
  incomeAllocatedByCategory: { ...emptyPrevious(), investment: 1_000 },
})

assert.equal(trackingWithIncomeAlloc.investment.allocated, 1_000)
assert.equal(trackingWithIncomeAlloc.investment.carryover, 500)
assert.equal(trackingWithIncomeAlloc.investment.available, 1_500)

const closing = calculateMonthClosing({
  categoryBalances: [{ category: "investment", balance: 1_000 }],
  expenses: [],
  transfers: [{ category: "investment", amount: 1_000 }],
  investments: [{ amount: 1_000 }],
  previousOverspentByCategory: emptyPrevious(),
})

assert.equal(closing.remaining.investment, 0)
assert.equal(closing.overspent.investment, 0)

console.log("category tracking calculation tests passed")
