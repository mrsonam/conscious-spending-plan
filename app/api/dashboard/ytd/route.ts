import { NextResponse } from "next/server"
import { moneyJsonResponse } from "@/lib/api-money-response"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { minorSumToDollars } from "@/lib/money-aggregates"
import { currencyFromSession } from "@/lib/user-currency"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = currencyFromSession(session.user.displayCurrency)
    const toD = (v: bigint | null | undefined) => minorSumToDollars(v, currency)

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

    return moneyJsonResponse(
      {
        year,
        totalIncome: toD(incomeAgg._sum.amount),
        totalExpenses: toD(expenseAgg._sum.amount),
        totalInvested: toD(investedAgg._sum.amount),
      },
      currency,
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
