import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getDbErrorResponse } from "@/lib/db-error"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const recurring = await prisma.recurringExpense.findMany({
      where: { userId: session.user.id },
      include: {
        account: { select: { id: true, name: true, bankName: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(
      { recurring },
      {
        headers: {
          "Cache-Control": "private, max-age=20, stale-while-revalidate=60",
        },
      },
    )
  } catch (error) {
    const dbErr = getDbErrorResponse(error)
    if (dbErr) return NextResponse.json(dbErr.body, { status: dbErr.status })
    console.error("Error fetching recurring expenses:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      accountId,
      amount,
      description,
      category,
      expenseCategory,
      frequency,
      startDate,
      endDate,
    } = body

    if (!accountId || !amount || amount <= 0 || !frequency) {
      return NextResponse.json(
        { error: "Account, amount (positive), and frequency are required" },
        { status: 400 }
      )
    }

    const validFrequencies = ["weekly", "monthly", "yearly"]
    if (!validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: "Frequency must be weekly, monthly, or yearly" },
        { status: 400 }
      )
    }

    const account = await prisma.account.findFirst({
      where: { id: accountId, userId: session.user.id },
    })
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    const recurring = await prisma.recurringExpense.create({
      data: {
        userId: session.user.id,
        accountId,
        amount: Number(amount),
        description: description || null,
        category: category || null,
        expenseCategory: expenseCategory || null,
        frequency,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        isActive: true,
      },
      include: {
        account: { select: { id: true, name: true, bankName: true } },
      },
    })

    return NextResponse.json({ recurring }, { status: 201 })
  } catch (error) {
    const dbErr = getDbErrorResponse(error)
    if (dbErr) return NextResponse.json(dbErr.body, { status: dbErr.status })
    console.error("Error creating recurring expense:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
