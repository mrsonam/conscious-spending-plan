import { addMinor, type MinorAmount } from "@/lib/money"

export type SavingGoalLedgerSource =
  | "income"
  | "manual_transfer"
  | "withdrawal"
  | "archive_reset"

export type SavingGoalLedgerEntryLike = {
  id: string
  source: SavingGoalLedgerSource
  amountMinor: MinorAmount
  incomeEntryId: string | null
  createdAt: Date | string
}

/**
 * Accumulate a running balance over entries given in ascending date order.
 * `runningBalanceMinor` after the last entry equals the goal's current balance.
 */
export function computeRunningBalancesMinor<T extends SavingGoalLedgerEntryLike>(
  entriesAscByDate: T[]
): Array<T & { runningBalanceMinor: MinorAmount }> {
  let balance: MinorAmount = 0n
  return entriesAscByDate.map((e) => {
    balance = addMinor(balance, e.amountMinor)
    return { ...e, runningBalanceMinor: balance }
  })
}

/** Split all-time ledger totals by source, for the details page stat row. */
export function summarizeSavingGoalLedgerMinor(entries: SavingGoalLedgerEntryLike[]): {
  totalContributedMinor: MinorAmount
  fromPaychecksMinor: MinorAmount
  fromManualTransfersMinor: MinorAmount
  withdrawnMinor: MinorAmount
} {
  let fromPaychecksMinor: MinorAmount = 0n
  let fromManualTransfersMinor: MinorAmount = 0n
  let withdrawnMinor: MinorAmount = 0n

  for (const e of entries) {
    if (e.source === "income") {
      fromPaychecksMinor = addMinor(fromPaychecksMinor, e.amountMinor)
    } else if (e.source === "manual_transfer") {
      fromManualTransfersMinor = addMinor(fromManualTransfersMinor, e.amountMinor)
    } else {
      // withdrawal | archive_reset — stored as negative amounts
      withdrawnMinor = addMinor(withdrawnMinor, -e.amountMinor)
    }
  }

  return {
    totalContributedMinor: addMinor(fromPaychecksMinor, fromManualTransfersMinor),
    fromPaychecksMinor,
    fromManualTransfersMinor,
    withdrawnMinor,
  }
}
