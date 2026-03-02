import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.recurringExpense.findFirst({
      where: { id, userId: session.user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: "Recurring expense not found" }, { status: 404 })
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
      isActive,
    } = body

    const validFrequencies = ["weekly", "monthly", "yearly"]
    if (frequency != null && !validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: "Frequency must be weekly, monthly, or yearly" },
        { status: 400 }
      )
    }

    if (accountId != null) {
      const account = await prisma.account.findFirst({
        where: { id: accountId, userId: session.user.id },
      })
      if (!account) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 })
      }
    }

    const recurring = await prisma.recurringExpense.update({
      where: { id },
      data: {
        ...(accountId != null && { accountId }),
        ...(amount != null && amount > 0 && { amount: Number(amount) }),
        ...(description !== undefined && { description: description || null }),
        ...(category !== undefined && { category: category || null }),
        ...(expenseCategory !== undefined && { expenseCategory: expenseCategory || null }),
        ...(frequency != null && { frequency }),
        ...(startDate != null && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(typeof isActive === "boolean" && { isActive }),
      },
      include: {
        account: { select: { id: true, name: true, bankName: true } },
      },
    })

    return NextResponse.json({ recurring })
  } catch (error) {
    console.error("Error updating recurring expense:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.recurringExpense.findFirst({
      where: { id, userId: session.user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: "Recurring expense not found" }, { status: 404 })
    }

    await prisma.recurringExpense.delete({ where: { id } })
    return NextResponse.json({ message: "Recurring expense deleted" })
  } catch (error) {
    console.error("Error deleting recurring expense:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
