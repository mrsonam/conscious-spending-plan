import { prisma } from "@/lib/prisma"
import { EXPENSE_CATEGORIES } from "@/lib/expense-page-constants"
import { minorSumToDollars } from "@/lib/money-aggregates"
import { getUserDisplayCurrency } from "@/lib/user-currency"

const TRAILING_MONTHS_FOR_AVERAGE = 6

/** Rolling mean of monthly expense totals (only months with spend > 0). */
export function computeAverageMonthlySpending(monthTotals: number[]): number {
  const withSpend = monthTotals.filter((total) => total > 0)
  if (withSpend.length === 0) return 0
  const sum = withSpend.reduce((acc, total) => acc + total, 0)
  return Math.round((sum / withSpend.length) * 100) / 100
}

function trailingMonthRanges(now: Date, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - index, 1)
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() - index + 1,
      0,
      23,
      59,
      59,
      999,
    )
    return { monthStart, monthEnd }
  })
}

export async function getExpenseSummary(userId: string) {
  const currency = await getUserDisplayCurrency(userId)
  const toD = (v: bigint | null | undefined) => minorSumToDollars(v, currency)
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  )
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const startPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endPrevMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59,
    999,
  )

  const statsWhereMonth = {
    userId,
    date: { gte: startOfMonth, lte: endOfMonth },
  }
  const statsWhereYtd = {
    userId,
    date: { gte: startOfYear, lte: endOfMonth },
  }
  const statsWherePrev = {
    userId,
    date: { gte: startPrevMonth, lte: endPrevMonth },
  }

  const [
    monthAgg,
    ytdAgg,
    prevAgg,
    monthByFund,
    monthByExpenseCategory,
    prevMonthByExpenseCategory,
    ...trailingMonthAggs
  ] = await Promise.all([
    prisma.expense.aggregate({
      where: statsWhereMonth,
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: statsWhereYtd,
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: statsWherePrev,
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["category"],
      where: statsWhereMonth,
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["expenseCategory"],
      where: {
        ...statsWhereMonth,
        expenseCategory: { not: null },
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.expense.groupBy({
      by: ["expenseCategory"],
      where: {
        ...statsWherePrev,
        expenseCategory: { not: null },
      },
      _sum: { amount: true },
    }),
    ...trailingMonthRanges(now, TRAILING_MONTHS_FOR_AVERAGE).map(({ monthStart, monthEnd }) =>
      prisma.expense.aggregate({
        where: {
          userId,
          date: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      }),
    ),
  ])

  const currentMonthTotal = toD(monthAgg._sum.amount)
  const ytdTotal = toD(ytdAgg._sum.amount)
  const lastMonthExpenses = toD(prevAgg._sum.amount)
  const averageMonthlySpending = computeAverageMonthlySpending(
    trailingMonthAggs.map((row) => toD(row._sum.amount)),
  )
  const monthOverMonthPct =
    lastMonthExpenses > 0
      ? ((currentMonthTotal - lastMonthExpenses) / lastMonthExpenses) * 100
      : null

  const fundBreakdownCurrentMonth = {
    fixedCosts: 0,
    investment: 0,
    savings: 0,
    guiltFreeSpending: 0,
  }

  for (const row of monthByFund) {
    const key = row.category
    if (!key) continue
    if (key in fundBreakdownCurrentMonth) {
      fundBreakdownCurrentMonth[key as keyof typeof fundBreakdownCurrentMonth] =
        toD(row._sum.amount)
    }
  }

  const expenseCategoryLabels = new Map<string, string>(
    EXPENSE_CATEGORIES.map((category) => [category.value, category.label]),
  )
  const prevCategoryAmounts = new Map(
    prevMonthByExpenseCategory.map((row) => [
      row.expenseCategory,
      toD(row._sum.amount),
    ]),
  )

  const topCategories = monthByExpenseCategory
    .filter((row) => row.expenseCategory != null)
    .map((row) => {
      const category = row.expenseCategory as string
      const amount = toD(row._sum.amount)
      const previousAmount = prevCategoryAmounts.get(category) ?? 0
      const count = row._count._all
      const momentumPct =
        previousAmount > 0
          ? ((amount - previousAmount) / previousAmount) * 100
          : amount > 0
            ? null
            : 0

      return {
        category,
        label: expenseCategoryLabels.get(category) ?? category,
        amount,
        count,
        sharePct: currentMonthTotal > 0 ? (amount / currentMonthTotal) * 100 : 0,
        averageAmount: count > 0 ? amount / count : 0,
        momentumPct,
        previousAmount,
      }
    })
    .sort((a, b) => b.amount - a.amount)

  const totalClassified = topCategories.reduce(
    (sum, category) => sum + category.amount,
    0,
  )

  return {
    currentMonthTotal,
    ytdTotal,
    monthOverMonthPct,
    lastMonthExpenses,
    averageMonthlySpending,
    fundBreakdownCurrentMonth,
    subcategoryInsights: {
      totalClassified,
      unclassifiedAmount: Math.max(0, currentMonthTotal - totalClassified),
      topSharePct: topCategories[0]?.sharePct ?? 0,
      topThreeSharePct: topCategories
        .slice(0, 3)
        .reduce((sum, category) => sum + category.sharePct, 0),
      averageEntryAmount:
        topCategories.reduce((sum, category) => sum + category.count, 0) > 0
          ? totalClassified /
            topCategories.reduce((sum, category) => sum + category.count, 0)
          : 0,
      topCategories: topCategories.slice(0, 6),
    },
  }
}
