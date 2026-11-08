import assert from "node:assert/strict"

import { summarizeDividends } from "../lib/investment-dividends"

const accounts = [
  { id: "a1", name: "Brokerage" },
  { id: "a2", name: "Roth IRA" },
]

const rows = [
  { id: "d1", date: "2026-10-02T00:00:00.000Z", amount: 48.2, name: "VTI", accountId: "a1" },
  { id: "d2", date: "2026-10-01T00:00:00.000Z", amount: 22.6, name: "SCHD", accountId: "a2" },
  { id: "d3", date: "2026-09-26T00:00:00.000Z", amount: 34.9, name: "schd ", accountId: "a2" },
  { id: "d4", date: "2025-12-15T00:00:00.000Z", amount: 10.1, name: "VTI", accountId: "a1" },
  // Same ticker in a different account stays a separate holding row.
  { id: "d5", date: "2026-08-04T00:00:00.000Z", amount: 5, name: "VTI", accountId: "a2" },
]

const now = new Date("2026-10-20T12:00:00.000Z")
const s = summarizeDividends(rows, accounts, now)

assert.equal(s.total, 120.8)
assert.equal(s.ytd, 110.7)
// Oct 2, Oct 1, Sep 26 fall within 30 days of Oct 20; Aug 4 does not.
assert.equal(s.last30Days, 105.7)
assert.equal(s.count, 5)

// By holding: largest total first, ticker matched case/space-insensitively per account.
assert.deepEqual(
  s.byHolding.map((h) => [h.symbol, h.accountName, h.count, h.total, h.lastPaid]),
  [
    ["VTI", "Brokerage", 2, 58.3, "2026-10-02T00:00:00.000Z"],
    ["SCHD", "Roth IRA", 2, 57.5, "2026-10-01T00:00:00.000Z"],
    ["VTI", "Roth IRA", 1, 5, "2026-08-04T00:00:00.000Z"],
  ],
)

// By month: newest first, payments newest first, months keyed on the calendar date
// the user entered (UTC), so an Oct 1 payment never slips into September.
assert.deepEqual(
  s.byMonth.map((m) => [m.key, m.total, m.payments.map((p) => p.id)]),
  [
    ["2026-10", 70.8, ["d1", "d2"]],
    ["2026-09", 34.9, ["d3"]],
    ["2026-08", 5, ["d5"]],
    ["2025-12", 10.1, ["d4"]],
  ],
)
assert.equal(s.byMonth[0].label, "October 2026")
assert.equal(s.byMonth[0].payments[1].accountName, "Roth IRA")

// Unknown account falls back to a dash; empty input is all zeros.
const orphan = summarizeDividends(
  [{ id: "x", date: "2026-01-05T00:00:00.000Z", amount: 1, name: "O", accountId: "gone" }],
  accounts,
  now,
)
assert.equal(orphan.byHolding[0].accountName, "-")
const empty = summarizeDividends([], accounts, now)
assert.equal(empty.total, 0)
assert.equal(empty.byMonth.length, 0)

console.log("investment-dividends tests passed")
