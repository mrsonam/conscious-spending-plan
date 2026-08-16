import type { MinorAmount } from "@/lib/money"

export type GoalExpenseWithdrawalValidation =
  | { ok: true }
  | { ok: false; error: string }

/** Can `amountMinor` be withdrawn from `goal` to cover a 'savings' category expense? */
export function validateGoalExpenseWithdrawal(
  goal: { status: string; currentMinor: MinorAmount } | null,
  amountMinor: MinorAmount
): GoalExpenseWithdrawalValidation {
  if (!goal) {
    return { ok: false, error: "Saving goal not found" }
  }
  if (goal.status !== "active") {
    return { ok: false, error: "Only active goals can be spent from" }
  }
  if (amountMinor > goal.currentMinor) {
    return { ok: false, error: "Amount exceeds the goal's available balance" }
  }
  return { ok: true }
}
