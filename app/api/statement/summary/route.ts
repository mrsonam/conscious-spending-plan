import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const accountId = searchParams.get("accountId")

    const incomeWhere: {
      userId: string
      accountId?: string
      date?: { gte?: Date; lte?: Date }
    } = {
      userId: session.user.id,
    }
    const expenseWhere: {
      userId: string
      accountId?: string
      date?: { gte?: Date; lte?: Date }
    } = {
      userId: session.user.id,
    }
    const transferWhere: {
      userId: string
      OR?: Array<{ fromAccountId: string } | { toAccountId: string }>
      date?: { gte?: Date; lte?: Date }
    } = {
      userId: session.user.id,
    }
    const investmentWhere: {
      userId: string
      accountId?: string
      date?: { gte?: Date; lte?: Date }
    } = {
      userId: session.user.id,
    }

    if (accountId) {
      incomeWhere.accountId = accountId
      expenseWhere.accountId = accountId
      transferWhere.OR = [{ fromAccountId: accountId }, { toAccountId: accountId }]
      investmentWhere.accountId = accountId
    }

    if (startDate || endDate) {
      const range: { gte?: Date; lte?: Date } = {}
      if (startDate) range.gte = new Date(startDate)
      if (endDate) range.lte = new Date(endDate)
      incomeWhere.date = range
      expenseWhere.date = range
      transferWhere.date = range
      investmentWhere.date = range
    }

    const [
      incomeAgg,
      incomeCount,
      expenseAgg,
      expenseCount,
      transferAgg,
      transferCount,
      investmentAgg,
      investmentCount,
    ] = await Promise.all([
      prisma.incomeEntry.aggregate({
        where: incomeWhere,
        _sum: { amount: true },
      }),
      prisma.incomeEntry.count({ where: incomeWhere }),
      prisma.expense.aggregate({
        where: expenseWhere,
        _sum: { amount: true },
      }),
      prisma.expense.count({ where: expenseWhere }),
      prisma.transfer.aggregate({
        where: transferWhere,
        _sum: { amount: true },
      }),
      prisma.transfer.count({ where: transferWhere }),
      prisma.investmentHolding.aggregate({
        where: investmentWhere,
        _sum: { amount: true },
      }),
      prisma.investmentHolding.count({ where: investmentWhere }),
    ])

    const income = incomeAgg._sum.amount ?? 0
    const expenses = expenseAgg._sum.amount ?? 0
    const transfers = transferAgg._sum.amount ?? 0
    const investments = investmentAgg._sum.amount ?? 0

    return NextResponse.json(
      {
        income,
        expenses,
        transfers,
        investments,
        net: income - expenses,
        totalRows:
          incomeCount + expenseCount + transferCount + investmentCount,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=20, stale-while-revalidate=60",
        },
      },
    )
  } catch (error) {
    console.error("Error fetching statement summary:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
