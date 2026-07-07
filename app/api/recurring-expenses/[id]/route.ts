import { NextResponse } from "next/server"
import { moneyJsonResponse } from "@/lib/api-money-response"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { parseMoneyFromApi } from "@/lib/money-api"
import { mapMoneyFieldsToApi, AMOUNT_ONLY_FIELDS } from "@/lib/money-serialize"
import { validateRecurringSchedule } from "@/lib/recurring-expense-schedule"
import { currencyFromSession } from "@/lib/user-currency"

export async function PATCH(
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
      intervalDays,
      startDate,
      endDate,
      isActive,
    } = body

    const nextFrequency = frequency ?? existing.frequency
    const parsedIntervalDays =
      intervalDays !== undefined
        ? intervalDays == null
          ? null
          : Math.floor(Number(intervalDays))
        : existing.intervalDays
    const scheduleCheck = validateRecurringSchedule(
      nextFrequency,
      nextFrequency === "custom" ? parsedIntervalDays : null,
    )
    if (!scheduleCheck.ok) {
      return NextResponse.json({ error: scheduleCheck.error }, { status: 400 })
    }

    if (accountId != null) {
      const account = await prisma.account.findFirst({
        where: { id: accountId, userId: session.user.id },
      })
      if (!account) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 })
      }
    }

    let amountMinor: bigint | undefined
    if (amount != null) {
      try {
        amountMinor = parseMoneyFromApi(amount, currency)
      } catch {
        return NextResponse.json({ error: "Amount must be positive" }, { status: 400 })
      }
      if (amountMinor <= 0n) {
        return NextResponse.json({ error: "Amount must be positive" }, { status: 400 })
      }
    }

    const recurring = await prisma.recurringExpense.update({
      where: { id },
      data: {
        ...(accountId != null && { accountId }),
        ...(amountMinor != null && { amount: amountMinor }),
        ...(description !== undefined && { description: description || null }),
        ...(category !== undefined && { category: category || null }),
        ...(expenseCategory !== undefined && { expenseCategory: expenseCategory || null }),
        ...(frequency != null && { frequency }),
        ...(frequency != null && {
          intervalDays: frequency === "custom" ? parsedIntervalDays : null,
        }),
        ...(intervalDays !== undefined &&
          frequency == null &&
          nextFrequency === "custom" && { intervalDays: parsedIntervalDays }),
        ...(startDate != null && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(typeof isActive === "boolean" && { isActive }),
      },
      include: {
        account: { select: { id: true, name: true, bankName: true } },
      },
    })

    return moneyJsonResponse(
      {
        recurring: mapMoneyFieldsToApi(
          recurring as unknown as Record<string, unknown>,
          currency,
          AMOUNT_ONLY_FIELDS,
        ),
      },
      currency
    )
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
