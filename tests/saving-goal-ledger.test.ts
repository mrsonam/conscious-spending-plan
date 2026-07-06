import assert from "node:assert/strict"

import {
  computeRunningBalancesMinor,
  summarizeSavingGoalLedgerMinor,
  type SavingGoalLedgerEntryLike,
} from "../lib/saving-goal-ledger"

function minor(dollars: number): bigint {
  return BigInt(Math.round(dollars * 100))
}

function entry(
  source: SavingGoalLedgerEntryLike["source"],
  dollars: number,
  createdAt: string,
  incomeEntryId: string | null = null
): SavingGoalLedgerEntryLike {
  return {
    id: `${source}-${createdAt}`,
    source,
    amountMinor: minor(dollars),
    incomeEntryId,
    createdAt,
  }
}

void (async () => {
  // computeRunningBalancesMinor: ascending balance accumulates in order
  const entries: SavingGoalLedgerEntryLike[] = [
    entry("income", 50, "2026-01-01", "inc1"),
    entry("manual_transfer", 20, "2026-01-05"),
    entry("withdrawal", -30, "2026-01-10"),
  ]
  const withBalances = computeRunningBalancesMinor(entries)
  assert.equal(withBalances[0].runningBalanceMinor, minor(50))
  assert.equal(withBalances[1].runningBalanceMinor, minor(70))
  assert.equal(withBalances[2].runningBalanceMinor, minor(40))

  // Empty ledger produces no rows and no crash
  assert.deepEqual(computeRunningBalancesMinor([]), [])

  // summarizeSavingGoalLedgerMinor: splits by source, nets debits
  const summary = summarizeSavingGoalLedgerMinor(entries)
  assert.equal(summary.fromPaychecksMinor, minor(50))
  assert.equal(summary.fromManualTransfersMinor, minor(20))
  assert.equal(summary.withdrawnMinor, minor(30))
  assert.equal(summary.totalContributedMinor, minor(70))

  // archive_reset counts as withdrawn too
  const withArchive = [...entries, entry("archive_reset", -40, "2026-01-15")]
  const summary2 = summarizeSavingGoalLedgerMinor(withArchive)
  assert.equal(summary2.withdrawnMinor, minor(70))

  // no entries at all
  const emptySummary = summarizeSavingGoalLedgerMinor([])
  assert.equal(emptySummary.totalContributedMinor, 0n)
  assert.equal(emptySummary.fromPaychecksMinor, 0n)
  assert.equal(emptySummary.fromManualTransfersMinor, 0n)
  assert.equal(emptySummary.withdrawnMinor, 0n)

  console.log("saving-goal-ledger.test.ts: all passed")
})()
