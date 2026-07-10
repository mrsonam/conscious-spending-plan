import { prisma } from "@/lib/prisma"
import type { IncomePageStats } from "@/lib/income-page-types"
import { minorSumToDollars } from "@/lib/money-aggregates"
import { getUserDisplayCurrency } from "@/lib/user-currency"

export async function getIncomePageStats(userId: string): Promise<IncomePageStats> {
  const currency = await getUserDisplayCurrency(userId)
  const toD = (v: bigint | null | undefined) => minorSumToDollars(v, currency)
  const now = new Date()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59,
    999,
  )
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const currentMonthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  )
  const yearStart = new Date(now.getFullYear(), 0, 1)
  const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)

  function monthKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  }

  const [lastMonthAgg, currentMonthAgg, ytdAgg] = await Promise.all([
    prisma.incomeEntry.aggregate({
      where: {
        userId,
        date: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.incomeEntry.aggregate({
      where: {
        userId,
        date: { gte: currentMonthStart, lte: currentMonthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.incomeEntry.aggregate({
      where: {
        userId,
        date: { gte: yearStart, lte: yearEnd },
      },
      _sum: { amount: true },
    }),
  ])

  const lastMonthIncome = toD(lastMonthAgg._sum.amount)
  const currentMonthTotal = toD(currentMonthAgg._sum.amount)
  const ytdTotal = toD(ytdAgg._sum.amount)

  let monthOverMonthPct: number | null = null
  if (lastMonthIncome > 0) {
    monthOverMonthPct =
      ((currentMonthTotal - lastMonthIncome) / lastMonthIncome) * 100
  }

  const monthlyTotals = await Promise.all(
    Array.from({ length: 6 }, (_, idx) => {
      const offset = 5 - idx
      const start = new Date(now.getFullYear(), now.getMonth() - offset, 1)
      const end = new Date(
        now.getFullYear(),
        now.getMonth() - offset + 1,
        0,
        23,
        59,
        59,
        999,
      )
      return prisma.incomeEntry
        .aggregate({
          where: { userId, date: { gte: start, lte: end } },
          _sum: { amount: true },
        })
        .then((agg) => ({
          month: monthKey(start),
          total: toD(agg._sum.amount),
        }))
    }),
  )

  return {
    currentMonthTotal,
    ytdTotal,
    monthOverMonthPct,
    lastMonthIncome,
    monthlyTotals,
  }
}
