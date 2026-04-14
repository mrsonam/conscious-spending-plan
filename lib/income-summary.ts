import { prisma } from "@/lib/prisma"
import type { IncomePageStats } from "@/lib/income-page-types"

export async function getIncomePageStats(userId: string): Promise<IncomePageStats> {
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

  const lastMonthIncome = lastMonthAgg._sum.amount ?? 0
  const currentMonthTotal = currentMonthAgg._sum.amount ?? 0
  const ytdTotal = ytdAgg._sum.amount ?? 0

  let monthOverMonthPct: number | null = null
  if (lastMonthIncome > 0) {
    monthOverMonthPct =
      ((currentMonthTotal - lastMonthIncome) / lastMonthIncome) * 100
  }

  return {
    currentMonthTotal,
    ytdTotal,
    monthOverMonthPct,
    lastMonthIncome,
  }
}
