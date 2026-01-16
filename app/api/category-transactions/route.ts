import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getCurrentMonthYear } from "@/lib/monthly-tracking"

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
    const category = searchParams.get("category")
    const month = searchParams.get("month")
    const year = searchParams.get("year")

    const where: any = {
      userId: session.user.id,
    }

    if (category) {
      where.category = category
    }

    if (month && year) {
      where.month = parseInt(month)
      where.year = parseInt(year)
    }

    const transactions = await prisma.categoryTransaction.findMany({
      where,
      orderBy: { date: "desc" },
      take: 200,
    })

    return NextResponse.json({ transactions })
  } catch (error) {
    console.error("Error fetching category transactions:", error)
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

    const { category, type, amount, description, date } = await request.json()

    if (!category || !type || !amount || amount <= 0 || !date) {
      return NextResponse.json(
        { error: "Category, type, amount, and date are required" },
        { status: 400 }
      )
    }

    const validCategories = ["fixedCosts", "savings", "investment", "guiltFreeSpending"]
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      )
    }

    if (type !== "expense" && type !== "income") {
      return NextResponse.json(
        { error: "Type must be 'expense' or 'income'" },
        { status: 400 }
      )
    }

    const transactionDate = new Date(date)
    const month = transactionDate.getMonth() + 1
    const year = transactionDate.getFullYear()

    const transaction = await prisma.categoryTransaction.create({
      data: {
        userId: session.user.id,
        category,
        type,
        amount,
        description,
        date: transactionDate,
        month,
        year,
      },
    })

    return NextResponse.json({ transaction }, { status: 201 })
  } catch (error) {
    console.error("Error creating category transaction:", error)
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
        { error: "Transaction ID is required" },
        { status: 400 }
      )
    }

    const transaction = await prisma.categoryTransaction.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      )
    }

    await prisma.categoryTransaction.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Transaction deleted successfully" })
  } catch (error) {
    console.error("Error deleting category transaction:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
