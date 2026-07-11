import assert from "node:assert/strict"
import { groupEntriesByRecency, ledgerGroupKeyForDate } from "../lib/ledger-groups"

void (async () => {
  const now = new Date("2026-07-15T12:00:00")

  assert.equal(ledgerGroupKeyForDate("2026-07-15T09:00:00", now), "today")
  assert.equal(ledgerGroupKeyForDate("2026-07-16T09:00:00", now), "today") // future-dated falls back to today
  assert.equal(ledgerGroupKeyForDate("2026-07-14T09:00:00", now), "yesterday")
  assert.equal(ledgerGroupKeyForDate("2026-07-10T09:00:00", now), "thisWeek")
  assert.equal(ledgerGroupKeyForDate("2026-07-08T09:00:00", now), "thisWeek") // exactly 7 days back
  assert.equal(ledgerGroupKeyForDate("2026-07-02T09:00:00", now), "earlierThisMonth")
  assert.equal(ledgerGroupKeyForDate("2026-06-30T09:00:00", now), "older")

  const entries = [
    { id: "a", date: "2026-07-15T09:00:00" }, // today
    { id: "b", date: "2026-07-15T08:00:00" }, // today
    { id: "c", date: "2026-07-14T09:00:00" }, // yesterday
    { id: "d", date: "2026-07-10T09:00:00" }, // this week
    { id: "e", date: "2026-07-02T09:00:00" }, // earlier this month
    { id: "f", date: "2026-06-01T09:00:00" }, // older
  ]

  const groups = groupEntriesByRecency(entries, now)
  assert.equal(groups.length, 5)
  assert.deepEqual(
    groups.map((g) => g.key),
    ["today", "yesterday", "thisWeek", "earlierThisMonth", "older"],
  )
  assert.deepEqual(
    groups[0]!.entries.map((e) => e.id),
    ["a", "b"],
  )
  assert.equal(groups[1]!.label, "Yesterday")

  const empty = groupEntriesByRecency([], now)
  assert.equal(empty.length, 0)

  console.log("ledger-groups.test.ts: all passed")
})()
