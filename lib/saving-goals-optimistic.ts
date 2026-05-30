import { createOptimisticId, roundMoney } from "@/lib/optimistic-id"

export type SavingGoalOptimisticRow = {
  id: string
  name: string
  target: number | null
  current: number
  percent: number
  status: "active" | "complete" | "archived"
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export type SavingGoalsSummaryOptimistic = {
  activeCount: number
  assignedPercent: number
  unassignedPercent: number
  generalSavingsAvailable: number
}

export function cloneSavingGoalsState(
  goals: SavingGoalOptimisticRow[],
  summary: SavingGoalsSummaryOptimistic
) {
  return {
    goals: goals.map((g) => ({ ...g })),
    summary: { ...summary },
  }
}

function recomputeSummary(
  goals: SavingGoalOptimisticRow[],
  generalSavingsAvailable: number
): SavingGoalsSummaryOptimistic {
  const activeGoals = goals.filter((g) => g.status === "active" || g.status === "complete")
  const assignedPercent = activeGoals.reduce((sum, g) => sum + g.percent, 0)
  return {
    activeCount: goals.filter((g) => g.status === "active").length,
    assignedPercent: roundMoney(assignedPercent),
    unassignedPercent: roundMoney(Math.max(0, 100 - assignedPercent)),
    generalSavingsAvailable: roundMoney(generalSavingsAvailable),
  }
}

export function applyOptimisticGoalCreate(
  goals: SavingGoalOptimisticRow[],
  summary: SavingGoalsSummaryOptimistic,
  input: { name: string; target: number | null; percent: number }
): {
  goals: SavingGoalOptimisticRow[]
  summary: SavingGoalsSummaryOptimistic
  optimisticId: string
} {
  const now = new Date().toISOString()
  const optimisticId = createOptimisticId("goal")
  const nextGoals: SavingGoalOptimisticRow[] = [
    ...goals,
    {
      id: optimisticId,
      name: input.name,
      target: input.target,
      current: 0,
      percent: input.percent,
      status: "active",
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    },
  ]
  return {
    goals: nextGoals,
    summary: recomputeSummary(nextGoals, summary.generalSavingsAvailable),
    optimisticId,
  }
}

export function replaceOptimisticGoalRow(
  goals: SavingGoalOptimisticRow[],
  optimisticId: string,
  serverGoal: SavingGoalOptimisticRow
): SavingGoalOptimisticRow[] {
  return goals.map((g) => (g.id === optimisticId ? serverGoal : g))
}

export function applyOptimisticGoalUpdate(
  goals: SavingGoalOptimisticRow[],
  summary: SavingGoalsSummaryOptimistic,
  goalId: string,
  updates: { name?: string; target?: number | null; percent?: number }
): { goals: SavingGoalOptimisticRow[]; summary: SavingGoalsSummaryOptimistic } {
  const nextGoals = goals.map((g) =>
    g.id === goalId
      ? {
          ...g,
          ...updates,
          updatedAt: new Date().toISOString(),
        }
      : g
  )
  return {
    goals: nextGoals,
    summary: recomputeSummary(nextGoals, summary.generalSavingsAvailable),
  }
}

export function applyOptimisticGoalTransfer(
  goals: SavingGoalOptimisticRow[],
  summary: SavingGoalsSummaryOptimistic,
  goalId: string,
  amount: number
): { goals: SavingGoalOptimisticRow[]; summary: SavingGoalsSummaryOptimistic } {
  const nextGoals = goals.map((g) => {
    if (g.id !== goalId) return g
    const nextCurrent = roundMoney(g.current + amount)
    const isComplete = g.target != null && g.target > 0 && nextCurrent >= g.target
    return {
      ...g,
      current: nextCurrent,
      status: isComplete ? ("complete" as const) : g.status,
      completedAt: isComplete ? new Date().toISOString() : g.completedAt,
      updatedAt: new Date().toISOString(),
    }
  })
  const general = roundMoney(Math.max(0, summary.generalSavingsAvailable - amount))
  return {
    goals: nextGoals,
    summary: recomputeSummary(nextGoals, general),
  }
}

export function applyOptimisticGoalArchive(
  goals: SavingGoalOptimisticRow[],
  summary: SavingGoalsSummaryOptimistic,
  goalId: string
): { goals: SavingGoalOptimisticRow[]; summary: SavingGoalsSummaryOptimistic } {
  const nextGoals = goals.map((g) =>
    g.id === goalId
      ? { ...g, status: "archived" as const, updatedAt: new Date().toISOString() }
      : g
  )
  return {
    goals: nextGoals,
    summary: recomputeSummary(nextGoals, summary.generalSavingsAvailable),
  }
}

export function applyOptimisticGoalWithdraw(
  goals: SavingGoalOptimisticRow[],
  summary: SavingGoalsSummaryOptimistic,
  goalId: string
): { goals: SavingGoalOptimisticRow[]; summary: SavingGoalsSummaryOptimistic } {
  const goal = goals.find((g) => g.id === goalId)
  const returned = goal?.current ?? 0
  const nextGoals = goals.map((g) =>
    g.id === goalId
      ? {
          ...g,
          current: 0,
          status: "archived" as const,
          updatedAt: new Date().toISOString(),
        }
      : g
  )
  const general = roundMoney(summary.generalSavingsAvailable + returned)
  return {
    goals: nextGoals,
    summary: recomputeSummary(nextGoals, general),
  }
}

export function applyOptimisticGoalDelete(
  goals: SavingGoalOptimisticRow[],
  summary: SavingGoalsSummaryOptimistic,
  goalId: string
): { goals: SavingGoalOptimisticRow[]; summary: SavingGoalsSummaryOptimistic } {
  const nextGoals = goals.filter((g) => g.id !== goalId)
  return {
    goals: nextGoals,
    summary: recomputeSummary(nextGoals, summary.generalSavingsAvailable),
  }
}
