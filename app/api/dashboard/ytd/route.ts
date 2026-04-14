import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const year = new Date().getFullYear()
    const startOfYear = new Date(year, 0, 1)
    const endOfYear = new Date()

    const [incomeAgg, expenseAgg, investedAgg] = await Promise.all([
      prisma.incomeEntry.aggregate({
        where: {
          userId: session.user.id,
          date: { gte: startOfYear, lte: endOfYear },
        },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: {
          userId: session.user.id,
          date: { gte: startOfYear, lte: endOfYear },
        },
        _sum: { amount: true },
      }),
      prisma.investmentHolding.aggregate({
        where: {
          userId: session.user.id,
          date: { gte: startOfYear, lte: endOfYear },
        },
        _sum: { amount: true },
      }),
    ])

    const totalIncome = incomeAgg._sum.amount ?? 0
    const totalExpenses = expenseAgg._sum.amount ?? 0
    const totalInvested = investedAgg._sum.amount ?? 0

    return NextResponse.json(
      {
        year,
        totalIncome,
        totalExpenses,
        totalInvested,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=20, stale-while-revalidate=60",
        },
      },
    )
  } catch (error) {
    console.error("Error fetching YTD summary:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
