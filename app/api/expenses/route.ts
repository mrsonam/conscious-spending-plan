import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { auth } from "@/lib/auth"
import { authFromRequest } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { getDbErrorResponse } from "@/lib/db-error"
import { getExpenseSummary } from "@/lib/expense-summary"

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

    const where: Prisma.ExpenseWhereInput = {
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
    const includeSummary = searchParams.get("includeSummary") !== "false"
    const page = usePagination ? Math.max(1, parseInt(pageParam || "1", 10)) : 1
    const limit = Math.min(50, Math.max(5, parseInt(searchParams.get("limit") || "10", 10)))
    const skip = usePagination ? (page - 1) * limit : 0
    const take = usePagination ? limit : 500

    const hasDateRange = !!(startDate && endDate)

    const [expenses, total, sumResult, summary] =
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
        usePagination && includeSummary
          ? getExpenseSummary(session.user.id)
          : Promise.resolve(null),
      ])

    const totalAmount = sumResult?._sum?.amount ?? null

    if (usePagination) {
      return NextResponse.json({
        expenses,
        total,
        page,
        limit,
        ...(summary ?? {}),
      }, {
        headers: {
          "Cache-Control": "private, max-age=20, stale-while-revalidate=60",
        },
      })
    }
    if (hasDateRange && totalAmount !== null) {
      return NextResponse.json(
        { expenses, total: totalAmount },
        {
          headers: {
            "Cache-Control": "private, max-age=20, stale-while-revalidate=60",
          },
        },
      )
    }
    return NextResponse.json(
      { expenses },
      {
        headers: {
          "Cache-Control": "private, max-age=20, stale-while-revalidate=60",
        },
      },
    )
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
    const authed = await authFromRequest(request)

    if (!authed) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = authed.userId
    const body = await request.json()
    const {
      amount,
      description,
      category,
      expenseCategory,
      date,
    }: {
      amount?: number
      description?: string | null
      category?: string | null
      expenseCategory?: string | null
      date?: string
    } = body
    let accountId: string | undefined = body.accountId

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Amount is required and must be greater than 0" },
        { status: 400 }
      )
    }

    // Fall back to the user's default account when caller (e.g. a Shortcut)
    // omits accountId. Existing web flows always send one explicitly.
    if (!accountId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { defaultAccountId: true },
      })
      if (!user?.defaultAccountId) {
        return NextResponse.json(
          {
            error:
              "No accountId provided and no default account is set on this user",
          },
          { status: 400 }
        )
      }
      accountId = user.defaultAccountId
    }

    // Default the date to "now" when omitted (Shortcuts may not pass one).
    const expenseDate = date ? new Date(date) : new Date()
    if (Number.isNaN(expenseDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date" },
        { status: 400 }
      )
    }

    // Verify account belongs to user
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
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
          userId,
          accountId,
          amount,
          description,
          category,
          expenseCategory,
          date: expenseDate,
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
