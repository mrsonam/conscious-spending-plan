import assert from "node:assert/strict"

import {
  bpsToDisplayPercent,
  computeSavingGoalCreditsMinor,
  displayPercentToBps,
  validateActiveGoalPercentSum,
} from "../lib/saving-goal-allocation"
import { dollarsToMinor } from "../lib/money"

const CURRENCY = "USD"

function minor(dollars: number): bigint {
  return dollarsToMinor(dollars, CURRENCY)
}

void (async () => {
  // Single goal 10% of $20 savings → $2
  {
    const result = computeSavingGoalCreditsMinor(minor(20), [
      {
        id: "phone",
        percentBps: 1000,
        currentMinor: 0n,
        targetMinor: minor(800),
      },
    ])
    assert.equal(result.credits.phone, minor(2))
    assert.equal(result.generalSavingsMinor, minor(18))
    assert.deepEqual(result.newlyComplete, [])
  }

  // Two goals 10% + 30% → $2 + $6, general $12
  {
    const result = computeSavingGoalCreditsMinor(minor(20), [
      {
        id: "phone",
        percentBps: 1000,
        currentMinor: 0n,
        targetMinor: minor(800),
      },
      {
        id: "emergency",
        percentBps: 3000,
        currentMinor: 0n,
        targetMinor: minor(5000),
      },
    ])
    assert.equal(result.credits.phone, minor(2))
    assert.equal(result.credits.emergency, minor(6))
    assert.equal(result.generalSavingsMinor, minor(12))
  }

  // Target reached, final credit capped at gap
  {
    const result = computeSavingGoalCreditsMinor(minor(20), [
      {
        id: "phone",
        percentBps: 1000,
        currentMinor: minor(799),
        targetMinor: minor(800),
      },
    ])
    assert.equal(result.credits.phone, minor(1))
    assert.equal(result.generalSavingsMinor, minor(19))
    assert.deepEqual(result.newlyComplete, ["phone"])
  }

  // Already at target, no credit
  {
    const result = computeSavingGoalCreditsMinor(minor(20), [
      {
        id: "phone",
        percentBps: 1000,
        currentMinor: minor(800),
        targetMinor: minor(800),
      },
    ])
    assert.equal(result.credits.phone, 0n)
    assert.equal(result.generalSavingsMinor, minor(20))
    assert.deepEqual(result.newlyComplete, ["phone"])
  }

  // Zero savings allocation
  {
    const result = computeSavingGoalCreditsMinor(0n, [
      {
        id: "phone",
        percentBps: 1000,
        currentMinor: 0n,
        targetMinor: minor(800),
      },
    ])
    assert.equal(result.generalSavingsMinor, 0n)
    assert.equal(result.credits.phone, undefined)
  }

  // Percent sum validation
  {
    const fail = validateActiveGoalPercentSum(
      [{ id: "a", percentBps: 6000 }],
      5000
    )
    assert.equal(fail.ok, false)
    if (!fail.ok) {
      assert.ok(fail.sumBps === 11000)
    }

    const ok = validateActiveGoalPercentSum(
      [{ id: "a", percentBps: 5000 }],
      5000
    )
    assert.equal(ok.ok, true)
  }

  // Bps helpers
  assert.equal(displayPercentToBps(10), 1000)
  assert.equal(bpsToDisplayPercent(1000), 10)

  // Open-ended goal, no target, keeps receiving credits
  {
    const result = computeSavingGoalCreditsMinor(minor(20), [
      {
        id: "emergency",
        percentBps: 2500,
        currentMinor: minor(100),
        targetMinor: null,
      },
    ])
    assert.equal(result.credits.emergency, minor(5))
    assert.equal(result.generalSavingsMinor, minor(15))
    assert.deepEqual(result.newlyComplete, [])
  }

  console.log("saving-goal-allocation.test.ts: all passed")
})()
