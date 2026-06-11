import { NextResponse } from "next/server"
import { moneyJsonResponse } from "@/lib/api-money-response"
import type { Prisma } from "@prisma/client"
import { auth } from "@/lib/auth"
import { authFromRequest } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { getDbErrorResponse } from "@/lib/db-error"
import { getExpenseSummary } from "@/lib/expense-summary"
import { parseMoneyFromApi, serializeMoneyForApi } from "@/lib/money-api"
import {
  mapMoneyFieldsToApi,
  mapMoneyListToApi,
  AMOUNT_ONLY_FIELDS,
} from "@/lib/money-serialize"
import { currencyFromSession, getUserDisplayCurrency } from "@/lib/user-currency"
import { minorSumToDollars } from "@/lib/money-aggregates"
import { schedulePersistPreviousMonthClosing } from "@/lib/monthly-tracking"

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

    const currency = currencyFromSession(session.user.displayCurrency)
    const expensesOut = mapMoneyListToApi(
      expenses as Record<string, unknown>[],
      currency,
      AMOUNT_ONLY_FIELDS
    )
    const totalAmountDollars =
      sumResult?._sum?.amount != null
        ? minorSumToDollars(sumResult._sum.amount, currency)
        : null

    if (usePagination) {
      return moneyJsonResponse(
        {
          expenses: expensesOut,
          total,
          page,
          limit,
          ...(summary ?? {}),
        },
        currency,
        {
          headers: {
            "Cache-Control": "private, max-age=20, stale-while-revalidate=60",
          },
        },
      )
    }
    if (hasDateRange && totalAmountDollars !== null) {
      return moneyJsonResponse(
        { expenses: expensesOut, total: totalAmountDollars },
        currency,
        {
          headers: {
            "Cache-Control": "private, max-age=20, stale-while-revalidate=60",
          },
        },
      )
    }
    return moneyJsonResponse(
      { expenses: expensesOut },
      currency,
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

    const currency = await getUserDisplayCurrency(userId)
    let amountMinor: bigint
    try {
      amountMinor = parseMoneyFromApi(amount, currency)
    } catch {
      return NextResponse.json(
        { error: "Amount is required and must be greater than 0" },
        { status: 400 }
      )
    }
    if (amountMinor <= 0n) {
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
    if (account.balance < amountMinor) {
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
          amount: amountMinor,
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
          balance: { decrement: amountMinor },
        },
      })

      return expense
    })

    schedulePersistPreviousMonthClosing(userId)

    return moneyJsonResponse(
      {
        expense: mapMoneyFieldsToApi(
          result as unknown as Record<string, unknown>,
          currency,
          AMOUNT_ONLY_FIELDS
        ),
      },
      currency,
      { status: 201 }
    )
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

export async function PATCH(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "Expense ID is required" },
        { status: 400 },
      )
    }

    const existing = await prisma.expense.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 })
    }

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
    const accountId: string | undefined = body.accountId

    const currency = currencyFromSession(session.user.displayCurrency)

    let amountMinor = existing.amount
    if (amount != null) {
      try {
        amountMinor = parseMoneyFromApi(amount, currency)
      } catch {
        return NextResponse.json(
          { error: "Amount must be greater than 0" },
          { status: 400 },
        )
      }
      if (amountMinor <= 0n) {
        return NextResponse.json(
          { error: "Amount must be greater than 0" },
          { status: 400 },
        )
      }
    }

    const nextAccountId = accountId ?? existing.accountId
    const expenseDate = date ? new Date(date) : existing.date
    if (Number.isNaN(expenseDate.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 })
    }

    const nextAccount = await prisma.account.findFirst({
      where: {
        id: nextAccountId,
        userId: session.user.id,
      },
    })

    if (!nextAccount) {
      return NextResponse.json(
        { error: "Account not found or does not belong to user" },
        { status: 404 },
      )
    }

    const sameAccount = nextAccountId === existing.accountId
    const amountDelta = amountMinor - existing.amount

    const result = await prisma.$transaction(async (tx) => {
      if (sameAccount) {
        if (amountDelta > 0n) {
          // Atomic check-and-decrement: WHERE balance >= amountDelta prevents overdraft
          const updated = await tx.account.updateMany({
            where: { id: nextAccountId, balance: { gte: amountDelta } },
            data: { balance: { decrement: amountDelta } },
          })
          if (updated.count === 0) throw new Error("INSUFFICIENT_FUNDS")
        } else if (amountDelta < 0n) {
          await tx.account.update({
            where: { id: nextAccountId },
            data: { balance: { increment: -amountDelta } },
          })
        }
      } else {
        // Atomic check-and-decrement on the new account
        const updated = await tx.account.updateMany({
          where: { id: nextAccountId, balance: { gte: amountMinor } },
          data: { balance: { decrement: amountMinor } },
        })
        if (updated.count === 0) throw new Error("INSUFFICIENT_FUNDS")
        await tx.account.update({
          where: { id: existing.accountId },
          data: { balance: { increment: existing.amount } },
        })
      }

      return tx.expense.update({
        where: { id },
        data: {
          accountId: nextAccountId,
          amount: amountMinor,
          ...(description !== undefined && { description: description || null }),
          ...(category !== undefined && { category: category || null }),
          ...(expenseCategory !== undefined && {
            expenseCategory: expenseCategory || null,
          }),
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
    })

    schedulePersistPreviousMonthClosing(session.user.id)

    return moneyJsonResponse(
      {
        expense: mapMoneyFieldsToApi(
          result as unknown as Record<string, unknown>,
          currency,
          AMOUNT_ONLY_FIELDS,
        ),
      },
      currency,
    )
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_FUNDS") {
      return NextResponse.json({ error: "Insufficient funds in the account" }, { status: 400 })
    }
    const dbErr = getDbErrorResponse(error)
    if (dbErr) return NextResponse.json(dbErr.body, { status: dbErr.status })
    console.error("Error updating expense:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
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
