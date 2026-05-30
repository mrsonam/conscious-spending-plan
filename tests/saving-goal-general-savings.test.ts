import assert from "node:assert/strict"

import {
  capTransferToGoalMinor,
  computeGeneralSavingsAvailableMinor,
} from "../lib/saving-goal-general-savings"

function minor(dollars: number): bigint {
  return BigInt(Math.round(dollars * 100))
}

void (async () => {
  assert.equal(
    computeGeneralSavingsAvailableMinor(minor(100), [minor(30), minor(20)]),
    minor(50)
  )
  assert.equal(
    computeGeneralSavingsAvailableMinor(minor(50), [minor(60)]),
    0n
  )

  const ok = capTransferToGoalMinor(minor(25), minor(50), minor(70), minor(100))
  assert.equal(ok.ok, true)
  if (ok.ok) assert.equal(ok.amountMinor, minor(25))

  const capped = capTransferToGoalMinor(minor(40), minor(50), minor(70), minor(100))
  assert.equal(capped.ok, false)
  if (!capped.ok) assert.match(capped.error, /remaining target/)

  const noPool = capTransferToGoalMinor(minor(10), 0n, 0n, null)
  assert.equal(noPool.ok, false)

  console.log("saving-goal-general-savings.test.ts: all passed")
})()
