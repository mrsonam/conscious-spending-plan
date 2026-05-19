import assert from "node:assert/strict"

import {
  addMinor,
  dollarsToMinor,
  minorToDollars,
  minorUnitFactor,
  percentOfMinor,
} from "../lib/money"
import { parseMoneyInput } from "../lib/money-input"

assert.equal(dollarsToMinor("10.00", "USD"), 1000n)
assert.equal(dollarsToMinor("10.005", "USD"), 1001n)
assert.equal(dollarsToMinor("-10.005", "USD"), -1001n)
assert.equal(dollarsToMinor("19.99", "AUD"), 1999n)
assert.equal(dollarsToMinor(100, "JPY"), 100n)
assert.equal(minorUnitFactor("JPY"), 1n)
assert.equal(minorUnitFactor("USD"), 100n)

assert.equal(minorToDollars(1001n, "USD"), 10.01)
assert.equal(minorToDollars(100n, "JPY"), 100)

const roundTrip = minorToDollars(dollarsToMinor("1234.56", "USD"), "USD")
assert.equal(roundTrip, 1234.56)

assert.equal(percentOfMinor(10000n, 50), 5000n)
assert.equal(percentOfMinor(10001n, 33.33), 3333n)
assert.equal(addMinor(100n, 200n), 300n)

assert.equal(dollarsToMinor("0.005", "USD"), 1n)
assert.equal(dollarsToMinor("999999.99", "USD"), 99999999n)
assert.equal(minorToDollars(100n, "JPY"), 100)
assert.equal(dollarsToMinor("100.4", "JPY"), 100n)
assert.equal(dollarsToMinor("100.5", "JPY"), 101n)

assert.equal(parseMoneyInput("10.005", "USD"), 10.01)
assert.equal(parseMoneyInput("100", "JPY"), 100)

console.log("money.test.ts: all assertions passed")