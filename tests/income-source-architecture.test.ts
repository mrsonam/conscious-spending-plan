import assert from "node:assert/strict"
import type { IncomeEntry } from "../lib/income-page-types"
import {
  groupIncomeSources,
  incomeSourceLabel,
} from "../lib/income-source-architecture"

function entry(
  partial: Partial<IncomeEntry> & Pick<IncomeEntry, "id" | "amount" | "date">,
): IncomeEntry {
  return {
    description: null,
    periodStart: partial.date,
    periodEnd: partial.date,
    createdAt: partial.date,
    ...partial,
  }
}

void (async () => {
  assert.equal(incomeSourceLabel(entry({ id: "1", amount: 1, date: "2026-07-01", description: "  Pay  " })), "Pay")
  assert.equal(
    incomeSourceLabel(
      entry({
        id: "2",
        amount: 1,
        date: "2026-07-01",
        account: { id: "a", name: "Checking", bankName: "Bank", accountType: "checking" },
      }),
    ),
    "Checking",
  )
  assert.equal(incomeSourceLabel(entry({ id: "3", amount: 1, date: "2026-07-01" })), "Unlabeled")

  const current = [
    entry({ id: "a", amount: 500, date: "2026-07-05", description: "Salary" }),
    entry({ id: "b", amount: 200, date: "2026-07-06", description: "Side" }),
    entry({ id: "c", amount: 100, date: "2026-07-07", description: "Gift" }),
    entry({ id: "d", amount: 50, date: "2026-07-08", description: "Refund" }),
    entry({ id: "e", amount: 40, date: "2026-07-09", description: "Bonus" }),
    entry({ id: "f", amount: 30, date: "2026-07-10", description: "Misc" }),
    entry({ id: "g", amount: 20, date: "2026-07-11", description: "Tip" }),
  ]
  const prior = [
    entry({ id: "p1", amount: 400, date: "2026-06-05", description: "Salary" }),
    entry({ id: "p2", amount: 100, date: "2026-06-06", description: "Side" }),
  ]

  const grouped = groupIncomeSources(current, prior, {
    now: new Date("2026-07-15T12:00:00"),
  })

  assert.equal(grouped.currentTotal, 940)
  assert.equal(grouped.rows.length, 6) // 5 + Other
  assert.equal(grouped.rows[0]!.label, "Salary")
  assert.equal(grouped.rows[0]!.amount, 500)
  assert.ok(grouped.rows[0]!.sharePct > 0)
  assert.equal(grouped.rows[0]!.momPct, 25) // (500-400)/400*100
  assert.equal(grouped.rows[5]!.label, "Other")
  assert.equal(grouped.rows[5]!.amount, 50) // Misc 30 + Tip 20
  assert.equal(grouped.rows[5]!.momPct, null)

  const newOnly = groupIncomeSources(
    [entry({ id: "n", amount: 100, date: "2026-07-01", description: "BrandNew" })],
    [],
    { now: new Date("2026-07-15T12:00:00") },
  )
  assert.equal(newOnly.rows.length, 1)
  assert.equal(newOnly.rows[0]!.momPct, null)
  assert.equal(newOnly.rows[0]!.isNew, true)

  const empty = groupIncomeSources([], prior, {
    now: new Date("2026-07-15T12:00:00"),
  })
  assert.equal(empty.currentTotal, 0)
  assert.equal(empty.rows.length, 0)

  const few = groupIncomeSources(
    [
      entry({ id: "1", amount: 10, date: "2026-07-01", description: "A" }),
      entry({ id: "2", amount: 5, date: "2026-07-01", description: "B" }),
    ],
    [],
    { now: new Date("2026-07-15T12:00:00") },
  )
  assert.equal(few.rows.length, 2)
  assert.ok(few.rows.every((r) => r.label !== "Other"))

  console.log("income-source-architecture.test.ts: all passed")
})()
