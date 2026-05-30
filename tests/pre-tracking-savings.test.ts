import assert from "node:assert/strict"

import { nextCalendarMonth, previousCalendarMonth } from "../lib/pre-tracking-savings"

assert.deepEqual(previousCalendarMonth(1, 2026), { month: 12, year: 2025 })
assert.deepEqual(previousCalendarMonth(3, 2026), { month: 2, year: 2026 })
assert.deepEqual(nextCalendarMonth(12, 2025), { month: 1, year: 2026 })
assert.deepEqual(nextCalendarMonth(2, 2026), { month: 3, year: 2026 })

console.log("pre-tracking-savings.test.ts: all passed")
