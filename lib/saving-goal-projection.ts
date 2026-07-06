import { prisma } from "@/lib/prisma"
import { serializeMoneyForApi } from "@/lib/money-api"
import { coerceMinor } from "@/lib/money"

/** How far back credits count toward the pace. */
const WINDOW_DAYS = 90
/** Don't extrapolate wildly from a brand-new goal's first few days. */
const MIN_PACE_DAYS = 30
/** Beyond this the estimate is noise, not insight. */
const MAX_PROJECTION_MONTHS = 120

const MS_PER_DAY = 86_400_000
const AVG_DAYS_PER_MONTH = 30.44

export type SavingGoalProjection = {
  /** Average amount funded per month over the recent window (display dollars). */
  monthlyPace: number
  /** ISO timestamp of the estimated completion at the current pace. */
  completeBy: string
}

/**
 * Pure pace math: given what was credited in the recent window, when does the
 * remaining amount get covered? Returns null when there's no meaningful pace.
 */
export function projectGoalCompletion({
  remainingMinor,
  windowSumMinor,
  paceDays,
  now,
}: {
  remainingMinor: bigint
  windowSumMinor: bigint
  paceDays: number
  now: Date
}): { monthlyPaceMinor: bigint; completeBy: Date } | null {
  if (remainingMinor <= 0n || windowSumMinor <= 0n) return null

  const days = Math.max(MIN_PACE_DAYS, Math.min(WINDOW_DAYS, paceDays))
  const monthlyPaceMinor = (windowSumMinor * 30n) / BigInt(days)
  if (monthlyPaceMinor <= 0n) return null

  const monthsRemaining = Number(remainingMinor) / Number(monthlyPaceMinor)
  if (!Number.isFinite(monthsRemaining) || monthsRemaining > MAX_PROJECTION_MONTHS) {
    return null
  }

  const completeBy = new Date(
    now.getTime() + monthsRemaining * AVG_DAYS_PER_MONTH * MS_PER_DAY,
  )
  return { monthlyPaceMinor, completeBy }
}

/**
 * Batched completion estimates for targeted, unfinished goals, based on the
 * credits they actually received in the last 90 days. One groupBy query for
 * the whole goal list.
 */
export async function loadSavingGoalProjections(
  userId: string,
  goals: Array<{
    id: string
    targetMinor: bigint | null
    currentMinor: bigint
    status: string
    createdAt: Date
  }>,
  currency: string,
  now: Date = new Date(),
): Promise<Record<string, SavingGoalProjection | null>> {
  const projections: Record<string, SavingGoalProjection | null> = {}
  const eligible = goals.filter(
    (g) =>
      g.status === "active" &&
      g.targetMinor != null &&
      coerceMinor(g.targetMinor) > coerceMinor(g.currentMinor),
  )
  for (const g of goals) projections[g.id] = null
  if (eligible.length === 0) return projections

  // Net every ledger source (income, manual transfers, withdrawals) so the
  // pace reflects actual recent progress, not just auto-credits.
  const windowStart = new Date(now.getTime() - WINDOW_DAYS * MS_PER_DAY)
  const sums = await prisma.savingGoalLedgerEntry.groupBy({
    by: ["savingGoalId"],
    where: {
      userId,
      savingGoalId: { in: eligible.map((g) => g.id) },
      createdAt: { gte: windowStart },
    },
    _sum: { amountMinor: true },
  })
  const sumByGoal = new Map(
    sums.map((s) => [s.savingGoalId, coerceMinor(s._sum.amountMinor)]),
  )

  for (const goal of eligible) {
    const windowSumMinor = sumByGoal.get(goal.id) ?? 0n
    const paceDays = Math.floor(
      (now.getTime() - new Date(goal.createdAt).getTime()) / MS_PER_DAY,
    )
    const result = projectGoalCompletion({
      remainingMinor: coerceMinor(goal.targetMinor) - coerceMinor(goal.currentMinor),
      windowSumMinor,
      paceDays,
      now,
    })
    projections[goal.id] = result
      ? {
          monthlyPace: serializeMoneyForApi(result.monthlyPaceMinor, currency),
          completeBy: result.completeBy.toISOString(),
        }
      : null
  }

  return projections
}
