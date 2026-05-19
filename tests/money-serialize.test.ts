import assert from "node:assert/strict"

import {
  deepSerializeBigIntsForApi,
  mapIncomeEntryToApi,
  mapTransferToApi,
} from "../lib/money-serialize"

const currency = "USD"

const entry = {
  id: "e1",
  amount: 12345n,
  allocationFixedCosts: 1000n,
  allocationSavings: 2000n,
  allocationInvestment: 3000n,
  allocationGuiltFreeSpending: 4000n,
  account: {
    id: "a1",
    balance: 50000n,
    startingFunds: 10000n,
    name: "Checking",
  },
}

const mapped = mapIncomeEntryToApi(entry, currency)
assert.equal(typeof mapped.amount, "number")
assert.equal(mapped.amount, 123.45)
assert.equal(typeof mapped.account.balance, "number")
assert.equal(mapped.account.balance, 500)
assert.equal(mapped.account.startingFunds, 100)

const transfer = {
  id: "t1",
  amount: 2500n,
  fromAccount: { id: "a1", balance: 1000n, startingFunds: 0n },
  toAccount: { id: "a2", balance: 2000n, startingFunds: 500n },
}
const mappedTransfer = mapTransferToApi(transfer, currency)
assert.equal(mappedTransfer.amount, 25)
assert.equal(mappedTransfer.fromAccount.balance, 10)
assert.equal(mappedTransfer.toAccount.startingFunds, 5)

const nested = {
  rows: [{ amount: 99n, account: { balance: 1n } }],
}
const deep = deepSerializeBigIntsForApi(nested, currency) as {
  rows: Array<{ amount: number; account: { balance: number } }>
}
assert.equal(deep.rows[0].amount, 0.99)
assert.equal(deep.rows[0].account.balance, 0.01)

assert.throws(() => JSON.stringify({ bad: 1n }))

console.log("money-serialize.test.ts: all assertions passed")
