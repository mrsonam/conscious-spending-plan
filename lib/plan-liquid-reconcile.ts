import type { CategoryTrackingValue } from "@/lib/category-tracking-calculation"
import { type TrackingCategory } from "@/lib/category-tracking-calculation"
import { sumDeployableBalance } from "@/lib/category-tracking-shared"
import { getCurrentMonthYear } from "@/lib/monthly-tracking"
import { addMinor, coerceMinor, dollarsToMinor } from "@/lib/money"
import { serializeMoneyForApi } from "@/lib/money-api"
import { prisma } from "@/lib/prisma"
import { PRE_TRACKING_SAVINGS_ACCOUNT_TYPES } from "@/lib/pre-tracking-savings"

/** Max liquid vs pillar gap auto-corrected on the savings envelope (dollars). */
export const MAX_LIQUID_GAP_AUTO_ADJUST = 100

/** Sum of checking, savings, and cash account balances. */
export async function sumLiquidAccountsMinor(userId: string): Promise<bigint> {
  const accounts = await prisma.account.findMany({
    where: {
      userId,
      accountType: { in: [...PRE_TRACKING_SAVINGS_ACCOUNT_TYPES] },
    },
    select: { balance: true },
  })

  return accounts.reduce(
    (sum, account) => addMinor(sum, coerceMinor(account.balance)),
    0n,
  )
}

/**
 * Read-only comparison of liquid cash vs pillar deployable headroom.
 * Does not mutate envelopes, display and diagnostics only.
 */
export async function reconcilePlanToLiquid(
  userId: string,
  month: number,
  year: number,
  currency: string,
  tracking: Record<TrackingCategory, CategoryTrackingValue>,
  savingsGeneralAvailable?: number,
  savingsAssignedToGoals?: number,
): Promise<{
  tracking: Record<TrackingCategory, CategoryTrackingValue>
  liquidTotal: number
  deployable: number
  gap: number
  adjusted: boolean
}> {
  const toD = (minor: bigint) => serializeMoneyForApi(minor, currency)
  const deployable = sumDeployableBalance(
    tracking,
    savingsGeneralAvailable,
    savingsAssignedToGoals,
  )
  const now = getCurrentMonthYear()
  const isCurrentMonth = month === now.month && year === now.year

  if (!isCurrentMonth) {
    return {
      tracking,
      liquidTotal: 0,
      deployable,
      gap: 0,
      adjusted: false,
    }
  }

  const liquidMinor = await sumLiquidAccountsMinor(userId)
  const liquidTotal = toD(liquidMinor)
  const gapMinor = liquidMinor - dollarsToMinor(deployable, currency)

  return {
    tracking,
    liquidTotal,
    deployable,
    gap: toD(gapMinor),
    adjusted: false,
  }
}

/**
 * Nudge the current-month savings envelope so pillar headroom sums to liquid.
 * gapDollars = liquid − deployable (negative when pillars exceed liquid).
 */
export async function applyLiquidGapToSavingsEnvelope(
  userId: string,
  month: number,
  year: number,
  currency: string,
  gapDollars: number,
): Promise<{ applied: boolean; adjustment: number }> {
  const adjustment = Math.round(gapDollars * 100) / 100
  if (Math.abs(adjustment) < 0.001 || Math.abs(adjustment) > MAX_LIQUID_GAP_AUTO_ADJUST) {
    return { applied: false, adjustment: 0 }
  }

  const row = await prisma.categoryBalance.findUnique({
    where: {
      userId_category_month_year: {
        userId,
        category: "savings",
        month,
        year,
      },
    },
    select: { balance: true },
  })

  const currentMinor = coerceMinor(row?.balance ?? 0n)
  const adjustmentMinor = dollarsToMinor(adjustment, currency)
  const nextMinor = addMinor(currentMinor, adjustmentMinor)
  if (nextMinor < 0n) {
    return { applied: false, adjustment: 0 }
  }

  await prisma.categoryBalance.upsert({
    where: {
      userId_category_month_year: {
        userId,
        category: "savings",
        month,
        year,
      },
    },
    create: {
      userId,
      category: "savings",
      month,
      year,
      balance: nextMinor,
    },
    update: {
      balance: nextMinor,
    },
  })

  return { applied: true, adjustment }
}
