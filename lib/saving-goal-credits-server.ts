import type { Prisma } from "@prisma/client"

import {
  computeSavingGoalCreditsMinor,
  type SavingGoalForAllocation,
} from "@/lib/saving-goal-allocation"
import { coerceMinor } from "@/lib/money"

type Tx = Prisma.TransactionClient

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

    await tx.savingGoalCredit.create({
      data: {
        userId,
        savingGoalId: goal.id,
        incomeEntryId,
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
  const credits = await tx.savingGoalCredit.findMany({
    where: {
      userId: params.userId,
      incomeEntryId: params.incomeEntryId,
    },
    include: { savingGoal: true },
  })

  for (const credit of credits) {
    const amount = coerceMinor(credit.amountMinor)
    if (amount <= 0n) continue

    const goal = credit.savingGoal
    const newCurrent = coerceMinor(goal.currentMinor) - amount
    const safeCurrent = newCurrent < 0n ? 0n : newCurrent

    const wasComplete = goal.status === "complete"
    const targetMinor =
      goal.targetMinor != null ? coerceMinor(goal.targetMinor) : null
    const shouldReactivate =
      wasComplete &&
      targetMinor != null &&
      targetMinor > 0n &&
      safeCurrent < targetMinor

    await tx.savingGoal.update({
      where: { id: goal.id },
      data: {
        currentMinor: safeCurrent,
        ...(shouldReactivate
          ? { status: "active", completedAt: null }
          : {}),
      },
    })
  }

  await tx.savingGoalCredit.deleteMany({
    where: {
      userId: params.userId,
      incomeEntryId: params.incomeEntryId,
    },
  })
}
