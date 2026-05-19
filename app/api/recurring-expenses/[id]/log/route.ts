import { NextResponse } from "next/server"
import { moneyJsonResponse } from "@/lib/api-money-response"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { mapMoneyFieldsToApi, AMOUNT_ONLY_FIELDS } from "@/lib/money-serialize"
import { currencyFromSession } from "@/lib/user-currency"
import { coerceMinor } from "@/lib/money"

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

    const currency = currencyFromSession(session.user.displayCurrency)
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
    const amountMinor = coerceMinor(recurring.amount)

    const account = await prisma.account.findFirst({
      where: { id: recurring.accountId, userId: session.user.id },
    })
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }
    if (coerceMinor(account.balance) < amountMinor) {
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
          amount: amountMinor,
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
        data: { balance: { decrement: amountMinor } },
      })
      return expense
    })

    return moneyJsonResponse(
      {
        expense: mapMoneyFieldsToApi(
          result as unknown as Record<string, unknown>,
          currency,
          AMOUNT_ONLY_FIELDS,
        ),
      },
      currency,
      { status: 201 }
    )
  } catch (error) {
    console.error("Error logging recurring expense:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
