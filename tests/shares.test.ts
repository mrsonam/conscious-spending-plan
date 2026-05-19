import assert from "node:assert/strict"

import {
  addShares,
  multiplySharesByPriceMinor,
  parseSharesInput,
} from "../lib/shares"
import { dollarsToMinor } from "../lib/money"

assert.equal(parseSharesInput("74.25"), "74.25")
assert.equal(parseSharesInput(" 10 "), "10")

const priceMinor = dollarsToMinor("10.00", "USD")
const line = multiplySharesByPriceMinor("3.5", priceMinor)
assert.equal(line, 3500n)

const total = addShares("1.25", "2.5")
assert.equal(total, "3.75")

console.log("shares.test.ts: all assertions passed")
