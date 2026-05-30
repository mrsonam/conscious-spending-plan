import assert from "node:assert/strict"

import { mapSavingGoalToApi } from "../lib/saving-goal-api-map"
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

  console.log("saving-goal-api-map.test.ts: all passed")
})()
