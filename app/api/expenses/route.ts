import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getDbErrorResponse } from "@/lib/db-error"

export async function GET(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const categoryParam = searchParams.get("category")
    const expenseCategoryParam = searchParams.get("expenseCategory")
    const accountIdParam = searchParams.get("accountId")

    const where: any = {
      userId: session.user.id,
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    // Support category filtering (comma-separated list)
    if (categoryParam) {
      const categories = categoryParam.split(",").map(c => c.trim())
      where.category = {
        in: categories,
      }
    }

    // Support expenseCategory filtering (comma-separated list)
    if (expenseCategoryParam) {
      const categories = expenseCategoryParam.split(",").map((c) => c.trim())
      where.expenseCategory = { in: categories }
    }

    // Support filtering by account id
    if (accountIdParam) {
      where.accountId = accountIdParam
    }

    const pageParam = searchParams.get("page")
    const usePagination = pageParam !== null && pageParam !== ""
    const page = usePagination ? Math.max(1, parseInt(pageParam || "1", 10)) : 1
    const limit = Math.min(50, Math.max(5, parseInt(searchParams.get("limit") || "10", 10)))
    const skip = usePagination ? (page - 1) * limit : 0
    const take = usePagination ? limit : 500

    const hasDateRange = !!(startDate && endDate)

    const userId = session.user.id
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

    const [expenses, total, sumResult, monthAgg, ytdAgg, prevAgg, monthByFund] =
      await Promise.all([
        prisma.expense.findMany({
          where,
          select: {
            id: true,
            amount: true,
            description: true,
            date: true,
            createdAt: true,
            category: true,
            expenseCategory: true,
            accountId: true,
            account: {
              select: {
                id: true,
                name: true,
                bankName: true,
              },
            },
          },
          orderBy: { date: "desc" },
          skip,
          take,
        }),
        usePagination ? prisma.expense.count({ where }) : 0,
        hasDateRange
          ? prisma.expense.aggregate({
              where,
              _sum: { amount: true },
            })
          : Promise.resolve(null),
        usePagination
          ? prisma.expense.aggregate({
              where: statsWhereMonth,
              _sum: { amount: true },
            })
          : Promise.resolve(null),
        usePagination
          ? prisma.expense.aggregate({
              where: statsWhereYtd,
              _sum: { amount: true },
            })
          : Promise.resolve(null),
        usePagination
          ? prisma.expense.aggregate({
              where: statsWherePrev,
              _sum: { amount: true },
            })
          : Promise.resolve(null),
        usePagination
          ? prisma.expense.groupBy({
              by: ["category"],
              where: statsWhereMonth,
              _sum: { amount: true },
            })
          : Promise.resolve([]),
      ])

    const totalAmount = sumResult?._sum?.amount ?? null

    if (usePagination) {
      const currentMonthTotal = monthAgg?._sum.amount ?? 0
      const ytdTotal = ytdAgg?._sum.amount ?? 0
      const lastMonthExpenses = prevAgg?._sum.amount ?? 0
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
            (row._sum.amount ?? 0) as number
        }
      }
      return NextResponse.json({
        expenses,
        total,
        page,
        limit,
        currentMonthTotal,
        ytdTotal,
        monthOverMonthPct,
        lastMonthExpenses,
        fundBreakdownCurrentMonth,
      })
    }
    if (hasDateRange && totalAmount !== null) {
      return NextResponse.json({ expenses, total: totalAmount })
    }
    return NextResponse.json({ expenses })
  } catch (error) {
    const dbErr = getDbErrorResponse(error)
    if (dbErr) return NextResponse.json(dbErr.body, { status: dbErr.status })
    console.error("Error fetching expenses:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { accountId, amount, description, category, expenseCategory, date } = await request.json()

    if (!accountId || !amount || amount <= 0 || !date) {
      return NextResponse.json(
        { error: "Account ID, amount, and date are required" },
        { status: 400 }
      )
    }

    // Verify account belongs to user
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId: session.user.id,
      },
    })

    if (!account) {
      return NextResponse.json(
        { error: "Account not found or does not belong to user" },
        { status: 404 }
      )
    }

    // Check if account has sufficient balance
    if (account.balance < amount) {
      return NextResponse.json(
        { error: "Insufficient funds in the account" },
        { status: 400 }
      )
    }

    // Create expense and update account balance in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          userId: session.user.id,
          accountId,
          amount,
          description,
          category,
          expenseCategory,
          date: new Date(date),
        },
        include: {
          account: {
            select: {
              id: true,
              name: true,
              bankName: true,
            },
          },
        },
      })

      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: { decrement: amount },
        },
      })

      return expense
    })

    return NextResponse.json({ expense: result }, { status: 201 })
  } catch (error) {
    const dbErr = getDbErrorResponse(error)
    if (dbErr) return NextResponse.json(dbErr.body, { status: dbErr.status })
    console.error("Error creating expense:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "Expense ID is required" },
        { status: 400 }
      )
    }

    // Get expense to restore balance
    const expense = await prisma.expense.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!expense) {
      return NextResponse.json(
        { error: "Expense not found" },
        { status: 404 }
      )
    }

    // Delete expense and restore account balance in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.expense.delete({
        where: { id },
      })

      await tx.account.update({
        where: { id: expense.accountId },
        data: {
          balance: { increment: expense.amount },
        },
      })
    })

    return NextResponse.json({ message: "Expense deleted successfully" })
  } catch (error) {
    const dbErr = getDbErrorResponse(error)
    if (dbErr) return NextResponse.json(dbErr.body, { status: dbErr.status })
    console.error("Error deleting expense:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
