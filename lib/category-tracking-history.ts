import { prisma } from "@/lib/prisma"
import {
  calculateCategoryTracking,
  TRACKING_CATEGORIES,
  type TrackingCategory,
} from "@/lib/category-tracking-calculation"
import { netPillarHeadroom } from "@/lib/category-tracking-shared"
import { buildAllocatedSoFarFromEntries } from "@/lib/income-allocation"
import { getCurrentMonthYear, getPreviousMonthRemainingAndOverspentByCategory } from "@/lib/monthly-tracking"
import { serializeMoneyForApi } from "@/lib/money-api"
import { coerceMinor } from "@/lib/money"

export type CategoryHistoryMonthRow = {
  month: string
  monthNum: number
  year: number
  allocated: number
  /** Spend or transfers out, matches pillar card "Spent"/"Transferred". */
  spent: number
  remaining: number
  overspent: number
}

export function buildRollingMonths(endMonth: number, endYear: number, count = 6) {
  const months: Array<{ month: number; year: number; label: string }> = []
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(endYear, endMonth - 1 - i, 1)
    months.push({
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      label: date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    })
  }
  return months
}

function inCalendarMonth(date: Date, month: number, year: number) {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0, 23, 59, 59, 999)
  return date >= start && date <= end
}

/**
 * Rolling month history using the same envelope math as /api/category-tracking.
 */
export async function loadCategoryTrackingHistory(
  userId: string,
  currency: string,
  options?: { endMonth?: number; endYear?: number; monthCount?: number },
): Promise<Record<TrackingCategory, CategoryHistoryMonthRow[]>> {
  const { month: defaultMonth, year: defaultYear } = getCurrentMonthYear()
  const endMonth = options?.endMonth ?? defaultMonth
  const endYear = options?.endYear ?? defaultYear
  const monthCount = options?.monthCount ?? 6

  const months = buildRollingMonths(endMonth, endYear, monthCount)
  const oldestMonth = months[0]
  const newestMonth = months[months.length - 1]
  const overallStart = new Date(oldestMonth.year, oldestMonth.month - 1, 1)
  const overallEnd = new Date(newestMonth.year, newestMonth.month, 0, 23, 59, 59, 999)

  const toD = (minor: bigint | null | undefined) =>
    serializeMoneyForApi(coerceMinor(minor ?? 0n), currency)

  const monthKeys = months.map((m) => ({ month: m.month, year: m.year }))

  const [allCategoryBalances, allExpenses, allTransfers, allIncomeEntries, fundAllocation] =
    await Promise.all([
      prisma.categoryBalance.findMany({
        where: {
          userId,
          OR: monthKeys.map(({ month, year }) => ({ month, year })),
        },
      }),
      prisma.expense.findMany({
        where: {
          userId,
          date: { gte: overallStart, lte: overallEnd },
          category: { in: [...TRACKING_CATEGORIES] },
        },
        select: { amount: true, category: true, date: true },
      }),
      prisma.transfer.findMany({
        where: {
          userId,
          date: { gte: overallStart, lte: overallEnd },
          category: { in: [...TRACKING_CATEGORIES] },
        },
        select: { amount: true, category: true, date: true },
      }),
      prisma.incomeEntry.findMany({
        where: {
          userId,
          date: { gte: overallStart, lte: overallEnd },
        },
        select: {
          amount: true,
          date: true,
          excludeFromAllocation: true,
          allocationFixedCosts: true,
          allocationSavings: true,
          allocationInvestment: true,
          allocationGuiltFreeSpending: true,
        },
      }),
      prisma.fundAllocation.findUnique({ where: { userId } }),
    ])

  // Read-only carryover lookups; fetch all months in parallel instead of
  // one round trip per loop iteration.
  const carryovers = await Promise.all(
    months.map(({ month, year }) =>
      getPreviousMonthRemainingAndOverspentByCategory(userId, month, year),
    ),
  )

  const history = Object.fromEntries(
    TRACKING_CATEGORIES.map((c) => [c, [] as CategoryHistoryMonthRow[]]),
  ) as Record<TrackingCategory, CategoryHistoryMonthRow[]>

  for (const [index, { month, year, label }] of months.entries()) {
    const categoryBalances = TRACKING_CATEGORIES.map((category) => {
      const row = allCategoryBalances.find(
        (b) => b.month === month && b.year === year && b.category === category,
      )
      return { category, balance: row ? toD(row.balance) : 0 }
    })

    const expenses = TRACKING_CATEGORIES.map((category) => ({
      category,
      amount: allExpenses
        .filter(
          (e) => e.category === category && inCalendarMonth(new Date(e.date), month, year),
        )
        .reduce((sum, e) => sum + toD(e.amount), 0),
    })).filter((e) => e.amount > 0)

    const transfers = TRACKING_CATEGORIES.map((category) => ({
      category,
      amount: allTransfers
        .filter(
          (t) => t.category === category && inCalendarMonth(new Date(t.date), month, year),
        )
        .reduce((sum, t) => sum + toD(t.amount), 0),
    })).filter((t) => t.amount > 0)

    const incomeEntriesForMonth = allIncomeEntries.filter((e) =>
      inCalendarMonth(new Date(e.date), month, year),
    )

    const { remaining: carryoverByCategory, overspent: overspentByCategory } =
      carryovers[index]

    let incomeAllocatedByCategory: Record<string, number> | undefined
    if (fundAllocation && incomeEntriesForMonth.length > 0) {
      const incomeAllocatedMinor = buildAllocatedSoFarFromEntries(
        incomeEntriesForMonth,
        fundAllocation,
        currency,
      )
      incomeAllocatedByCategory = {}
      for (const cat of TRACKING_CATEGORIES) {
        incomeAllocatedByCategory[cat] = toD(incomeAllocatedMinor[cat])
      }
    }

    const tracking = calculateCategoryTracking({
      categoryBalances,
      expenses,
      transfers,
      investments: [],
      carryoverByCategory,
      overspentByCategory,
      incomeAllocatedByCategory,
    })

    for (const cat of TRACKING_CATEGORIES) {
      const row = tracking[cat]
      const spent = cat === "investment" ? row.transferred : row.spent
      history[cat].push({
        month: label,
        monthNum: month,
        year,
        allocated: row.allocated,
        spent,
        remaining: netPillarHeadroom(row),
        overspent: row.overspent,
      })
    }
  }

  return history
}
