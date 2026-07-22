import assert from "node:assert/strict"

import {
  computeCategoryPace,
  categoryPaceMeta,
} from "../components/category-tracking/category-tracking-console-ui"
import { TOKENS } from "../lib/wealth-console-tokens"
import { INCOME_PAGE_ERROR_SOFT as ERROR_SOFT } from "../lib/income-page-types"

// Mid-month, heavily deployed → Hot for both modes; colors differ.
assert.equal(computeCategoryPace(80, 0.5).state, "hot")
assert.equal(categoryPaceMeta("hot", "spend").color, ERROR_SOFT)
assert.equal(categoryPaceMeta("hot", "invest").color, TOKENS.primary)

// Mid-month, barely deployed → Cool; invest uses warning nudge.
assert.equal(computeCategoryPace(20, 0.5).state, "cool")
assert.equal(categoryPaceMeta("cool", "spend").color, TOKENS.secondary)
assert.equal(categoryPaceMeta("cool", "invest").color, TOKENS.warning)

assert.equal(computeCategoryPace(50, 0.5).state, "balanced")

console.log("category-pace.test.ts: all passed")
