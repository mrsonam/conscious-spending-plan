import assert from "node:assert/strict"

import { validateGoalExpenseWithdrawal } from "../lib/saving-goal-expense-link"

function minor(dollars: number): bigint {
  return BigInt(Math.round(dollars * 100))
}

void (async () => {
  const notFound = validateGoalExpenseWithdrawal(null, minor(10))
  assert.equal(notFound.ok, false)
  if (!notFound.ok) assert.match(notFound.error, /not found/)

  const archived = validateGoalExpenseWithdrawal(
    { status: "archived", currentMinor: minor(100) },
    minor(10)
  )
  assert.equal(archived.ok, false)
  if (!archived.ok) assert.match(archived.error, /active/)

  const complete = validateGoalExpenseWithdrawal(
    { status: "complete", currentMinor: minor(100) },
    minor(10)
  )
  assert.equal(complete.ok, false)

  const overdrawn = validateGoalExpenseWithdrawal(
    { status: "active", currentMinor: minor(5) },
    minor(10)
  )
  assert.equal(overdrawn.ok, false)
  if (!overdrawn.ok) assert.match(overdrawn.error, /available balance/)

  const exact = validateGoalExpenseWithdrawal(
    { status: "active", currentMinor: minor(10) },
    minor(10)
  )
  assert.equal(exact.ok, true)

  const withRoom = validateGoalExpenseWithdrawal(
    { status: "active", currentMinor: minor(50) },
    minor(10)
  )
  assert.equal(withRoom.ok, true)

  console.log("saving-goal-expense-link.test.ts: all passed")
})()
