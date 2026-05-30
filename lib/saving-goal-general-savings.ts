import type { Prisma } from "@prisma/client"

import { addMinor, coerceMinor, subtractMinor, type MinorAmount } from "@/lib/money"
import { getCurrentMonthYear } from "@/lib/monthly-tracking"

type Tx = Prisma.TransactionClient

export function computeGeneralSavingsAvailableMinor(
  savingsBucketMinor: MinorAmount,
  goalCurrentsMinor: MinorAmount[]
): MinorAmount {
  const assigned = goalCurrentsMinor.reduce(
    (sum, current) => addMinor(sum, current),
    0n
  )
  if (savingsBucketMinor <= assigned) return 0n
  return subtractMinor(savingsBucketMinor, assigned)
}

export function capTransferToGoalMinor(
  amountMinor: MinorAmount,
  availableMinor: MinorAmount,
  goalCurrentMinor: MinorAmount,
  targetMinor: MinorAmount | null
): { ok: true; amountMinor: MinorAmount } | { ok: false; error: string } {
  if (amountMinor <= 0n) {
    return { ok: false, error: "Amount must be greater than zero" }
  }
  if (availableMinor <= 0n) {
    return { ok: false, error: "No general savings available to transfer" }
  }
  if (amountMinor > availableMinor) {
    return { ok: false, error: "Amount exceeds available general savings" }
  }

  if (targetMinor != null && targetMinor > 0n) {
    if (goalCurrentMinor >= targetMinor) {
      return { ok: false, error: "Goal has already reached its target" }
    }
    const gap = subtractMinor(targetMinor, goalCurrentMinor)
    if (amountMinor > gap) {
      return { ok: false, error: "Amount exceeds remaining target balance" }
    }
  }

  return { ok: true, amountMinor }
}

export async function loadGeneralSavingsContext(
  db: Tx | typeof import("@/lib/prisma").prisma,
  userId: string,
  month?: number,
  year?: number
) {
  const resolved = month != null && year != null ? { month, year } : getCurrentMonthYear()

  const [savingsRow, goals] = await Promise.all([
    db.categoryBalance.findFirst({
      where: {
        userId,
        category: "savings",
        month: resolved.month,
        year: resolved.year,
      },
    }),
    db.savingGoal.findMany({
      where: { userId, status: { not: "archived" } },
      select: { currentMinor: true },
    }),
  ])

  const savingsBucketMinor = coerceMinor(savingsRow?.balance ?? 0n)
  const goalCurrentsMinor = goals.map((g) => coerceMinor(g.currentMinor))
  const assignedToGoalsMinor = goalCurrentsMinor.reduce(
    (sum, current) => addMinor(sum, current),
    0n
  )
  const availableMinor = computeGeneralSavingsAvailableMinor(
    savingsBucketMinor,
    goalCurrentsMinor
  )

  return {
    month: resolved.month,
    year: resolved.year,
    savingsBucketMinor,
    assignedToGoalsMinor,
    availableMinor,
  }
}

/** Move funds from the general savings pool into an active saving goal. */
export async function transferToSavingGoal(
  tx: Tx,
  params: {
    userId: string
    goalId: string
    amountMinor: MinorAmount
  }
) {
  const { userId, goalId, amountMinor } = params

  const goal = await tx.savingGoal.findFirst({
    where: { id: goalId, userId },
  })

  if (!goal) {
    return { ok: false as const, error: "Saving goal not found" }
  }
  if (goal.status !== "active") {
    return { ok: false as const, error: "Only active goals can receive transfers" }
  }

  const { availableMinor } = await loadGeneralSavingsContext(tx, userId)
  const currentMinor = coerceMinor(goal.currentMinor)
  const targetMinor =
    goal.targetMinor != null ? coerceMinor(goal.targetMinor) : null

  const capped = capTransferToGoalMinor(
    amountMinor,
    availableMinor,
    currentMinor,
    targetMinor
  )
  if (!capped.ok) {
    return capped
  }

  const transferMinor = capped.amountMinor
  const newCurrent = addMinor(currentMinor, transferMinor)
  const isComplete =
    targetMinor != null && targetMinor > 0n && newCurrent >= targetMinor

  const updated = await tx.savingGoal.update({
    where: { id: goalId },
    data: {
      currentMinor: newCurrent,
      ...(isComplete ? { status: "complete", completedAt: new Date() } : {}),
    },
  })

  return { ok: true as const, goal: updated, transferredMinor: transferMinor }
}
