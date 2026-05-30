import { serializeMoneyForApi } from "@/lib/money-api"
import { bpsToDisplayPercent } from "@/lib/saving-goal-allocation"
import { coerceMinor } from "@/lib/money"

type GoalRecord = Record<string, unknown>

/** Client-facing saving goal shape (`target` / `current`, not `*Minor`). */
export function mapSavingGoalToApi(goal: GoalRecord, currency: string) {
  const targetMinor = goal.targetMinor
  const currentMinor = goal.currentMinor

  return {
    id: goal.id as string,
    name: goal.name as string,
    status: goal.status as string,
    current: serializeMoneyForApi(coerceMinor(currentMinor as bigint), currency),
    target:
      targetMinor != null
        ? serializeMoneyForApi(coerceMinor(targetMinor as bigint), currency)
        : null,
    percent: bpsToDisplayPercent(goal.percentBps as number),
    completedAt: (goal.completedAt as string | Date | null) ?? null,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  }
}

export function mapSavingGoalListToApi(goals: GoalRecord[], currency: string) {
  return goals.map((g) => mapSavingGoalToApi(g, currency))
}
