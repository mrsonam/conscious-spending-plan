import type { CategoryTrackingValue } from "@/lib/category-tracking-calculation"
import { type TrackingCategory } from "@/lib/category-tracking-calculation"
import { sumDeployableBalance } from "@/lib/category-tracking-shared"
import { ensureMonthClosing, getCurrentMonthYear } from "@/lib/monthly-tracking"
import { addMinor, coerceMinor, dollarsToMinor } from "@/lib/money"
import { serializeMoneyForApi } from "@/lib/money-api"
import { prisma } from "@/lib/prisma"
import { PRE_TRACKING_SAVINGS_ACCOUNT_TYPES } from "@/lib/pre-tracking-savings"

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
    0n
  )
}

function absMinor(value: bigint): bigint {
  return value < 0n ? -value : value
}

function patchSavingsAfterReconcile(
  tracking: Record<TrackingCategory, CategoryTrackingValue>,
  gapDollars: number
): Record<TrackingCategory, CategoryTrackingValue> {
  const savings = tracking.savings
  if (!savings) return tracking

  const available = round2(savings.available + gapDollars)
  const net = available - savings.spent - savings.transferred

  return {
    ...tracking,
    savings: {
      ...savings,
      available,
      remaining: round2(Math.max(0, net)),
      overspent: round2(net < 0 ? Math.abs(net) : 0),
    },
  }
}

function round2(value: number) {
  return Math.round(value * 100) / 100
}

/**
 * Nudge the current month's savings envelope so deployable headroom matches liquid cash.
 * Only runs for the calendar month being viewed when it is also the current month.
 */
export async function reconcilePlanToLiquid(
  userId: string,
  month: number,
  year: number,
  currency: string,
  tracking: Record<TrackingCategory, CategoryTrackingValue>
): Promise<{
  tracking: Record<TrackingCategory, CategoryTrackingValue>
  liquidTotal: number
  deployable: number
  gap: number
  adjusted: boolean
}> {
  const toD = (minor: bigint) => serializeMoneyForApi(minor, currency)
  const now = getCurrentMonthYear()
  const deployableBefore = sumDeployableBalance(tracking)

  if (month !== now.month || year !== now.year) {
    return {
      tracking,
      liquidTotal: 0,
      deployable: deployableBefore,
      gap: 0,
      adjusted: false,
    }
  }

  const liquidMinor = await sumLiquidAccountsMinor(userId)
  const deployableMinor = dollarsToMinor(deployableBefore, currency)
  const gapMinor = liquidMinor - deployableMinor

  if (gapMinor === 0n) {
    return {
      tracking,
      liquidTotal: toD(liquidMinor),
      deployable: deployableBefore,
      gap: 0,
      adjusted: false,
    }
  }

  const maxAutoGap = dollarsToMinor(100, currency)
  if (absMinor(gapMinor) > maxAutoGap) {
    return {
      tracking,
      liquidTotal: toD(liquidMinor),
      deployable: deployableBefore,
      gap: toD(gapMinor),
      adjusted: false,
    }
  }

  const savingsRow = await prisma.categoryBalance.findFirst({
    where: { userId, category: "savings", month, year },
  })
  const currentSavingsMinor = coerceMinor(savingsRow?.balance ?? 0n)
  const nextSavingsMinor = addMinor(currentSavingsMinor, gapMinor)

  if (nextSavingsMinor < 0n) {
    return {
      tracking,
      liquidTotal: toD(liquidMinor),
      deployable: deployableBefore,
      gap: toD(gapMinor),
      adjusted: false,
    }
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
      balance: nextSavingsMinor,
    },
    update: {
      balance: nextSavingsMinor,
    },
  })

  await ensureMonthClosing(userId, month, year)

  const gapDollars = toD(gapMinor)
  const patched = patchSavingsAfterReconcile(tracking, gapDollars)

  return {
    tracking: patched,
    liquidTotal: toD(liquidMinor),
    deployable: sumDeployableBalance(patched),
    gap: gapDollars,
    adjusted: true,
  }
}
