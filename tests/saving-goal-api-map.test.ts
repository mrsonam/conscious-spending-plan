import assert from "node:assert/strict"

import { mapSavingGoalToApi, mapSavingGoalLedgerEntryToApi } from "../lib/saving-goal-api-map"
import { dollarsToMinor } from "../lib/money"

const CURRENCY = "USD"

void (async () => {
  const mapped = mapSavingGoalToApi(
    {
      id: "g1",
      name: "Phone",
      status: "active",
      targetMinor: dollarsToMinor(800, CURRENCY),
      currentMinor: dollarsToMinor(200, CURRENCY),
      percentBps: 1000,
      completedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    CURRENCY
  )

  assert.equal(mapped.name, "Phone")
  assert.equal(mapped.target, 800)
  assert.equal(mapped.current, 200)
  assert.equal(mapped.percent, 10)

  const openEnded = mapSavingGoalToApi(
    {
      id: "g2",
      name: "Emergency",
      status: "active",
      targetMinor: null,
      currentMinor: dollarsToMinor(50, CURRENCY),
      percentBps: 2000,
      completedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    CURRENCY
  )

  assert.equal(openEnded.target, null)
  assert.equal(openEnded.current, 50)

  const ledgerMapped = mapSavingGoalLedgerEntryToApi(
    {
      id: "l1",
      source: "manual_transfer",
      amountMinor: dollarsToMinor(15, CURRENCY),
      runningBalanceMinor: dollarsToMinor(215, CURRENCY),
      incomeEntryId: null,
      createdAt: "2026-06-01T00:00:00.000Z",
    },
    CURRENCY
  )
  assert.equal(ledgerMapped.source, "manual_transfer")
  assert.equal(ledgerMapped.amount, 15)
  assert.equal(ledgerMapped.runningBalance, 215)
  assert.equal(ledgerMapped.incomeEntryId, null)

  const negativeLedgerMapped = mapSavingGoalLedgerEntryToApi(
    {
      id: "l2",
      source: "withdrawal",
      amountMinor: dollarsToMinor(-215, CURRENCY),
      runningBalanceMinor: dollarsToMinor(0, CURRENCY),
      incomeEntryId: null,
      createdAt: "2026-06-02T00:00:00.000Z",
    },
    CURRENCY
  )
  assert.equal(negativeLedgerMapped.amount, -215)
  assert.equal(negativeLedgerMapped.runningBalance, 0)

  console.log("saving-goal-api-map.test.ts: all passed")
})()
