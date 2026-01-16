import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

    const expenses = await prisma.expense.findMany({
      where,
      select: {
        id: true,
        amount: true,
        description: true,
        date: true,
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
      take: 100,
    })

    return NextResponse.json({ expenses })
  } catch (error) {
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
    console.error("Error deleting expense:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
