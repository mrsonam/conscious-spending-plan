import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/** POST: Create a one-time expense from this recurring template (optionally with a specific date). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const recurring = await prisma.recurringExpense.findFirst({
      where: { id, userId: session.user.id },
      include: { account: true },
    })
    if (!recurring) {
      return NextResponse.json({ error: "Recurring expense not found" }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const date = body.date ? new Date(body.date) : new Date()

    const account = await prisma.account.findFirst({
      where: { id: recurring.accountId, userId: session.user.id },
    })
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }
    if (account.balance < recurring.amount) {
      return NextResponse.json(
        { error: "Insufficient funds in the account" },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          userId: session.user.id,
          accountId: recurring.accountId,
          amount: recurring.amount,
          description: recurring.description,
          category: recurring.category,
          expenseCategory: recurring.expenseCategory,
          date,
        },
        include: {
          account: { select: { id: true, name: true, bankName: true } },
        },
      })
      await tx.account.update({
        where: { id: recurring.accountId },
        data: { balance: { decrement: recurring.amount } },
      })
      return expense
    })

    return NextResponse.json({ expense: result }, { status: 201 })
  } catch (error) {
    console.error("Error logging recurring expense:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
