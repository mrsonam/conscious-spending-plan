import type { PrismaContext } from "@/lib/prisma"

import {
  computeSavingGoalCreditsMinor,
  type SavingGoalForAllocation,
} from "@/lib/saving-goal-allocation"
import { coerceMinor } from "@/lib/money"

type Tx = PrismaContext

/** Apply saving-goal credits for one income entry inside a transaction. */
export async function applySavingGoalCreditsForIncome(
  tx: Tx,
  params: {
    userId: string
    incomeEntryId: string
    savingsAllocationMinor: bigint
  }
): Promise<{ generalSavingsMinor: bigint; goalCredits: Record<string, bigint> }> {
  const { userId, incomeEntryId, savingsAllocationMinor } = params

  if (savingsAllocationMinor <= 0n) {
    return { generalSavingsMinor: 0n, goalCredits: {} }
  }

  const activeGoals = await tx.savingGoal.findMany({
    where: { userId, status: "active" },
    orderBy: { createdAt: "asc" },
  })

  if (activeGoals.length === 0) {
    return { generalSavingsMinor: savingsAllocationMinor, goalCredits: {} }
  }

  const goalsForAlloc: SavingGoalForAllocation[] = activeGoals.map((g) => ({
    id: g.id,
    percentBps: g.percentBps,
    currentMinor: coerceMinor(g.currentMinor),
    targetMinor: g.targetMinor != null ? coerceMinor(g.targetMinor) : null,
  }))

  const { credits, generalSavingsMinor, newlyComplete } =
    computeSavingGoalCreditsMinor(savingsAllocationMinor, goalsForAlloc)

  for (const goal of activeGoals) {
    const credit = credits[goal.id] ?? 0n
    if (credit <= 0n) {
      if (newlyComplete.includes(goal.id)) {
        await tx.savingGoal.update({
          where: { id: goal.id },
          data: {
            status: "complete",
            completedAt: new Date(),
          },
        })
      }
      continue
    }

    await tx.savingGoalLedgerEntry.create({
      data: {
        userId,
        savingGoalId: goal.id,
        incomeEntryId,
        source: "income",
        amountMinor: credit,
      },
    })

    const newCurrent = coerceMinor(goal.currentMinor) + credit
    const targetMinor = goal.targetMinor != null ? coerceMinor(goal.targetMinor) : null
    const isComplete =
      targetMinor != null &&
      targetMinor > 0n &&
      (newlyComplete.includes(goal.id) || newCurrent >= targetMinor)

    await tx.savingGoal.update({
      where: { id: goal.id },
      data: {
        currentMinor: newCurrent,
        ...(isComplete
          ? { status: "complete", completedAt: new Date() }
          : {}),
      },
    })
  }

  return { generalSavingsMinor, goalCredits: credits }
}

/** Reverse saving-goal credits when an income entry is deleted. */
export async function reverseSavingGoalCreditsForIncome(
  tx: Tx,
  params: { userId: string; incomeEntryId: string }
): Promise<void> {
  const credits = await tx.savingGoalLedgerEntry.findMany({
    where: {
      userId: params.userId,
      incomeEntryId: params.incomeEntryId,
      source: "income",
    },
    include: { savingGoal: true },
  })

  const reversibleIds: string[] = []

  for (const credit of credits) {
    const amount = coerceMinor(credit.amountMinor)
    if (amount <= 0n) {
      reversibleIds.push(credit.id)
      continue
    }

    const goal = credit.savingGoal
    const newCurrent = coerceMinor(goal.currentMinor) - amount

    if (newCurrent < 0n) {
      // This credit's amount already left the goal via a later withdrawal or
      // archive reset. Reversing it here would make sum(ledger) diverge from
      // currentMinor, which must never happen. Leave this credit row and the
      // goal's balance untouched rather than corrupting the ledger.
      //
      // The caller deletes the IncomeEntry right after this function returns,
      // and SavingGoalLedgerEntry.incomeEntryId has onDelete: Cascade — so if
      // we left this row pointing at that soon-to-be-deleted parent, the DB
      // would force-delete it out from under us, silently reintroducing the
      // exact divergence we just avoided. Detach it from the income entry
      // (the field is nullable and other sources already use null here) so
      // it survives as a permanent, if now slightly stale, ledger row.
      await tx.savingGoalLedgerEntry.update({
        where: { id: credit.id },
        data: { incomeEntryId: null },
      })
      continue
    }

    const wasComplete = goal.status === "complete"
    const targetMinor =
      goal.targetMinor != null ? coerceMinor(goal.targetMinor) : null
    const shouldReactivate =
      wasComplete && targetMinor != null && targetMinor > 0n && newCurrent < targetMinor

    await tx.savingGoal.update({
      where: { id: goal.id },
      data: {
        currentMinor: newCurrent,
        ...(shouldReactivate ? { status: "active", completedAt: null } : {}),
      },
    })

    reversibleIds.push(credit.id)
  }

  if (reversibleIds.length > 0) {
    await tx.savingGoalLedgerEntry.deleteMany({
      where: { id: { in: reversibleIds } },
    })
  }
}
