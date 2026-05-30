import { addMinor, coerceMinor, dollarsToMinor } from "@/lib/money"
import { buildAllocatedSoFarFromEntries } from "@/lib/income-allocation"
import { FUND_CATEGORIES } from "@/lib/fund-allocation-fields"
import { serializeMoneyForApi } from "@/lib/money-api"
import {
  ensureMonthClosing,
  getCurrentMonthYear,
  getIncomeEntriesForMonthByDate,
  getPreviousMonthRemainingByCategory,
} from "@/lib/monthly-tracking"
import { prisma } from "@/lib/prisma"
import { getUserDisplayCurrency } from "@/lib/user-currency"

/** Bank account types whose starting balance seeds the savings bucket. */
export const PRE_TRACKING_SAVINGS_ACCOUNT_TYPES = [
  "checking",
  "savings",
  "cash",
] as const

export function previousCalendarMonth(month: number, year: number) {
  return month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year }
}

export function nextCalendarMonth(month: number, year: number) {
  return month === 12 ? { month: 1, year: year + 1 } : { month: month + 1, year }
}

function monthOnOrBefore(
  month: number,
  year: number,
  endMonth: number,
  endYear: number
) {
  return year < endYear || (year === endYear && month <= endMonth)
}

/** First month with allocated income, else onboarding completion month. */
export async function resolveTrackingStartMonth(
  userId: string
): Promise<{ month: number; year: number } | null> {
  const firstIncome = await prisma.incomeEntry.findFirst({
    where: { userId, excludeFromAllocation: false },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    select: { date: true },
  })

  if (firstIncome) {
    const d = firstIncome.date
    return { month: d.getMonth() + 1, year: d.getFullYear() }
  }

  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: { onboardingCompletedAt: true },
  })

  if (user?.onboardingCompletedAt) {
    const d = user.onboardingCompletedAt
    return { month: d.getMonth() + 1, year: d.getFullYear() }
  }

  return null
}

/** Sum of starting balances on non-investment bank accounts (pre-tracking pool). */
export async function sumPreTrackingSavingsMinor(
  userId: string,
  trackingStart?: { month: number; year: number } | null
): Promise<bigint> {
  const accounts = await prisma.account.findMany({
    where: {
      userId,
      accountType: { in: [...PRE_TRACKING_SAVINGS_ACCOUNT_TYPES] },
    },
    select: { id: true, balance: true, startingFunds: true },
  })

  const fromStartingFunds = accounts.reduce(
    (sum, account) => addMinor(sum, coerceMinor(account.startingFunds)),
    0n
  )
  if (fromStartingFunds > 0n) {
    return fromStartingFunds
  }

  const resolvedStart = trackingStart ?? (await resolveTrackingStartMonth(userId))
  if (!resolvedStart) {
    return 0n
  }

  return computeInferredPreTrackingSavingsMinor(userId, accounts, resolvedStart)
}

/**
 * Infer pre-tracking liquid savings when startingFunds were never captured:
 * current liquid balances minus net tracked cashflow since tracking began.
 */
export async function computeInferredPreTrackingSavingsMinor(
  userId: string,
  liquidAccounts: Array<{ id: string; balance: bigint }>,
  trackingStart: { month: number; year: number }
): Promise<bigint> {
  if (liquidAccounts.length === 0) {
    return 0n
  }

  const liquidIds = liquidAccounts.map((a) => a.id)
  const liquidBalance = liquidAccounts.reduce(
    (sum, account) => addMinor(sum, coerceMinor(account.balance)),
    0n
  )

  const trackingStartDate = new Date(trackingStart.year, trackingStart.month - 1, 1)

  const [incomeRows, expenseRows, transferRows] = await Promise.all([
    prisma.incomeEntry.findMany({
      where: {
        userId,
        accountId: { in: liquidIds },
        date: { gte: trackingStartDate },
      },
      select: { amount: true },
    }),
    prisma.expense.findMany({
      where: {
        userId,
        accountId: { in: liquidIds },
        date: { gte: trackingStartDate },
      },
      select: { amount: true },
    }),
    prisma.transfer.findMany({
      where: {
        userId,
        date: { gte: trackingStartDate },
        OR: [
          { fromAccountId: { in: liquidIds } },
          { toAccountId: { in: liquidIds } },
        ],
      },
      select: { fromAccountId: true, toAccountId: true, amount: true },
    }),
  ])

  let incomeMinor = 0n
  for (const row of incomeRows) {
    incomeMinor = addMinor(incomeMinor, coerceMinor(row.amount))
  }

  let expenseMinor = 0n
  for (const row of expenseRows) {
    expenseMinor = addMinor(expenseMinor, coerceMinor(row.amount))
  }

  let transferOutMinor = 0n
  let transferInMinor = 0n
  const liquidIdSet = new Set(liquidIds)
  for (const row of transferRows) {
    const amount = coerceMinor(row.amount)
    if (liquidIdSet.has(row.fromAccountId)) {
      transferOutMinor = addMinor(transferOutMinor, amount)
    }
    if (liquidIdSet.has(row.toAccountId)) {
      transferInMinor = addMinor(transferInMinor, amount)
    }
  }

  const inferred = liquidBalance - incomeMinor + expenseMinor + transferOutMinor - transferInMinor
  return inferred > 0n ? inferred : 0n
}

/** Carryover added to savings in the first tracked month (dollars). */
export async function getPreTrackingSavingsCarryoverDollars(
  userId: string,
  month: number,
  year: number,
  currency?: string
): Promise<number> {
  const trackingStart = await resolveTrackingStartMonth(userId)
  if (!trackingStart || trackingStart.month !== month || trackingStart.year !== year) {
    return 0
  }

  const seedMinor = await sumPreTrackingSavingsMinor(userId, trackingStart)
  if (seedMinor <= 0n) {
    return 0
  }

  const resolvedCurrency = currency ?? (await getUserDisplayCurrency(userId))
  return serializeMoneyForApi(seedMinor, resolvedCurrency)
}

async function upsertCategoryBalanceExact(
  userId: string,
  category: string,
  month: number,
  year: number,
  balanceMinor: bigint
) {
  await prisma.categoryBalance.upsert({
    where: {
      userId_category_month_year: {
        userId,
        category,
        month,
        year,
      },
    },
    create: {
      userId,
      category,
      month,
      year,
      balance: balanceMinor,
    },
    update: {
      balance: balanceMinor,
    },
  })
}

/**
 * Replay envelope balances and month closings from tracking start through today.
 * Keeps carry/clawback in sync after pre-tracking seed changes Jan and downstream months.
 */
async function reconcileEnvelopeChainFromTrackingStart(
  userId: string,
  trackingStart: { month: number; year: number },
  currency: string
) {
  const fundAllocation = await prisma.fundAllocation.findUnique({ where: { userId } })
  const { month: endMonth, year: endYear } = getCurrentMonthYear()

  let { month, year } = trackingStart

  while (monthOnOrBefore(month, year, endMonth, endYear)) {
    const carryover = await getPreviousMonthRemainingByCategory(userId, month, year)

    let incomeTotals = Object.fromEntries(
      FUND_CATEGORIES.map((cat) => [cat, 0n])
    ) as Record<(typeof FUND_CATEGORIES)[number], bigint>

    if (fundAllocation) {
      const incomeEntries = await getIncomeEntriesForMonthByDate(userId, month, year)
      incomeTotals = buildAllocatedSoFarFromEntries(
        incomeEntries.map((entry) => ({
          excludeFromAllocation: entry.excludeFromAllocation,
          amount: entry.amount,
          allocationFixedCosts: entry.allocationFixedCosts,
          allocationSavings: entry.allocationSavings,
          allocationInvestment: entry.allocationInvestment,
          allocationGuiltFreeSpending: entry.allocationGuiltFreeSpending,
        })),
        fundAllocation,
        currency
      )
    }

    for (const cat of FUND_CATEGORIES) {
      const balanceMinor = addMinor(
        dollarsToMinor(carryover[cat] ?? 0, currency),
        incomeTotals[cat]
      )
      await upsertCategoryBalanceExact(userId, cat, month, year, balanceMinor)
    }

    await ensureMonthClosing(userId, month, year)

    const next = nextCalendarMonth(month, year)
    month = next.month
    year = next.year
  }
}

/**
 * Seed pre-tracking bank balances into the savings bucket for the first tracked month.
 * Idempotent — safe to call on every read/write path.
 */
export async function ensurePreTrackingSavingsBalances(userId: string) {
  const trackingStart = await resolveTrackingStartMonth(userId)
  if (!trackingStart) return

  const seedMinor = await sumPreTrackingSavingsMinor(userId, trackingStart)
  if (seedMinor <= 0n) return

  const currency = await getUserDisplayCurrency(userId)
  const { month, year } = trackingStart
  const prev = previousCalendarMonth(month, year)

  // Month before tracking: savings envelope holds the pre-tracking pool.
  await upsertCategoryBalanceExact(userId, "savings", prev.month, prev.year, seedMinor)
  await ensureMonthClosing(userId, prev.month, prev.year)

  await reconcileEnvelopeChainFromTrackingStart(userId, trackingStart, currency)
}
