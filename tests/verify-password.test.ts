import assert from "node:assert/strict"
import bcrypt from "bcryptjs"

import { verifyPassword } from "../lib/verify-password"

void (async () => {
  const hash = await bcrypt.hash("correct-horse-battery-staple", 10)

  assert.equal(await verifyPassword(hash, "correct-horse-battery-staple"), true)
  assert.equal(await verifyPassword(hash, "wrong-password"), false)
  // No stored hash (user doesn't exist) must not throw and must fail closed.
  assert.equal(await verifyPassword(null, "anything"), false)
  assert.equal(await verifyPassword(undefined, "anything"), false)

  console.log("verify-password tests passed")
})()
