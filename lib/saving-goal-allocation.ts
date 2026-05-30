import { addMinor, percentOfMinor, subtractMinor, type MinorAmount } from "@/lib/money"
import { parseMoneyFromApi } from "@/lib/money-api"

export type SavingGoalForAllocation = {
  id: string
  percentBps: number
  currentMinor: MinorAmount
  targetMinor: MinorAmount | null
}

export type SavingGoalCreditResult = {
  credits: Record<string, MinorAmount>
  generalSavingsMinor: MinorAmount
  newlyComplete: string[]
}

const MAX_GOAL_PERCENT_BPS = 10000

/** Sum percentBps for goals with status active (caller filters by status). */
export function sumGoalPercentBps(
  goals: { percentBps: number }[]
): number {
  return goals.reduce((sum, g) => sum + g.percentBps, 0)
}

/** Validate that active goal percentages do not exceed 100% of savings bucket. */
export function validateActiveGoalPercentSum(
  activeGoals: { id: string; percentBps: number }[],
  additionalBps = 0,
  excludeGoalId?: string
): { ok: true } | { ok: false; sumBps: number; message: string } {
  const sum = activeGoals
    .filter((g) => g.id !== excludeGoalId)
    .reduce((acc, g) => acc + g.percentBps, 0) + additionalBps

  if (sum > MAX_GOAL_PERCENT_BPS) {
    return {
      ok: false,
      sumBps: sum,
      message: `Active goal percentages total ${(sum / 100).toFixed(1)}% — maximum is 100% of savings allocation`,
    }
  }
  return { ok: true }
}

/** Convert display percent (0–100) to basis points. */
export function displayPercentToBps(percent: number): number {
  return Math.round(percent * 100)
}

/** Convert basis points to display percent. */
export function bpsToDisplayPercent(bps: number): number {
  return bps / 100
}

/** Parse optional target from API input; blank/null clears the target. */
export function parseOptionalTargetMinor(
  value: unknown,
  currency: string
): { ok: true; value: MinorAmount | null } | { ok: false; error: string } {
  if (value === null || value === undefined) {
    return { ok: true, value: null }
  }
  if (typeof value === "string" && value.trim() === "") {
    return { ok: true, value: null }
  }
  try {
    const minor = parseMoneyFromApi(value, currency)
    if (minor <= 0n) {
      return { ok: false, error: "Target amount must be greater than zero" }
    }
    return { ok: true, value: minor }
  } catch {
    return { ok: false, error: "Enter a valid target amount or leave blank" }
  }
}

/**
 * Split a savings-bucket allocation across active saving goals.
 * Remainder goes to general savings. Final credit per goal capped at target gap.
 */
export function computeSavingGoalCreditsMinor(
  savingsAllocationMinor: MinorAmount,
  activeGoals: SavingGoalForAllocation[]
): SavingGoalCreditResult {
  const credits: Record<string, MinorAmount> = {}
  const newlyComplete: string[] = []

  if (savingsAllocationMinor <= 0n || activeGoals.length === 0) {
    return {
      credits,
      generalSavingsMinor: savingsAllocationMinor > 0n ? savingsAllocationMinor : 0n,
      newlyComplete,
    }
  }

  let assigned = 0n

  for (const goal of activeGoals) {
    if (goal.percentBps <= 0) {
      credits[goal.id] = 0n
      continue
    }

    const hasTarget = goal.targetMinor != null && goal.targetMinor > 0n

    if (hasTarget) {
      const gap =
        goal.targetMinor! > goal.currentMinor
          ? subtractMinor(goal.targetMinor!, goal.currentMinor)
          : 0n

      if (gap <= 0n) {
        credits[goal.id] = 0n
        newlyComplete.push(goal.id)
        continue
      }

      let credit = percentOfMinor(
        savingsAllocationMinor,
        goal.percentBps / 100
      )

      if (credit > gap) {
        credit = gap
      }

      credits[goal.id] = credit
      assigned = addMinor(assigned, credit)

      if (addMinor(goal.currentMinor, credit) >= goal.targetMinor!) {
        newlyComplete.push(goal.id)
      }
      continue
    }

    const credit = percentOfMinor(
      savingsAllocationMinor,
      goal.percentBps / 100
    )
    credits[goal.id] = credit
    assigned = addMinor(assigned, credit)
  }

  const generalSavingsMinor =
    savingsAllocationMinor > assigned
      ? subtractMinor(savingsAllocationMinor, assigned)
      : 0n

  return { credits, generalSavingsMinor, newlyComplete }
}
