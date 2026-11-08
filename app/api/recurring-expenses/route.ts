import { NextResponse } from "next/server"
import { moneyJsonResponse } from "@/lib/api-money-response"
import { authFromRequest } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { getDbErrorResponse } from "@/lib/db-error"
import { parseMoneyFromApi } from "@/lib/money-api"
import { mapMoneyFieldsToApi, AMOUNT_ONLY_FIELDS } from "@/lib/money-serialize"
import { validateRecurringSchedule } from "@/lib/recurring-expense-schedule"
import { getUserDisplayCurrency } from "@/lib/user-currency"

function serializeRecurring(
  recurring: Record<string, unknown>,
  currency: string
) {
  const out = mapMoneyFieldsToApi(recurring, currency, AMOUNT_ONLY_FIELDS)
  const account = recurring.account as Record<string, unknown> | undefined
  if (account) {
    out.account = account
  }
  return out
}

export async function GET(request: Request) {
  try {
    const authed = await authFromRequest(request)
    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = await getUserDisplayCurrency(authed.userId)
    const recurring = await prisma.recurringExpense.findMany({
      where: { userId: authed.userId },
      include: {
        account: { select: { id: true, name: true, bankName: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return moneyJsonResponse(
      {
        recurring: recurring.map((r) =>
          serializeRecurring(r as unknown as Record<string, unknown>, currency)
        ),
      },
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
    console.error("Error fetching recurring expenses:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authed = await authFromRequest(request)
    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = await getUserDisplayCurrency(authed.userId)
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
    } = body

    if (!accountId || amount == null || !frequency) {
      return NextResponse.json(
        { error: "Account, amount (positive), and frequency are required" },
        { status: 400 }
      )
    }

    let amountMinor: bigint
    try {
      amountMinor = parseMoneyFromApi(amount, currency)
    } catch {
      return NextResponse.json(
        { error: "Account, amount (positive), and frequency are required" },
        { status: 400 }
      )
    }
    if (amountMinor <= 0n) {
      return NextResponse.json(
        { error: "Account, amount (positive), and frequency are required" },
        { status: 400 }
      )
    }

    const parsedIntervalDays =
      intervalDays != null ? Math.floor(Number(intervalDays)) : null
    const scheduleCheck = validateRecurringSchedule(
      frequency,
      parsedIntervalDays,
    )
    if (!scheduleCheck.ok) {
      return NextResponse.json({ error: scheduleCheck.error }, { status: 400 })
    }

    const account = await prisma.account.findFirst({
      where: { id: accountId, userId: authed.userId },
    })
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    const recurring = await prisma.recurringExpense.create({
      data: {
        userId: authed.userId,
        accountId,
        amount: amountMinor,
        description: description || null,
        category: category || null,
        expenseCategory: expenseCategory || null,
        frequency,
        intervalDays: frequency === "custom" ? parsedIntervalDays : null,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        isActive: true,
      },
      include: {
        account: { select: { id: true, name: true, bankName: true } },
      },
    })

    return moneyJsonResponse(
      {
        recurring: serializeRecurring(
          recurring as unknown as Record<string, unknown>,
          currency
        ),
      },
      currency,
      { status: 201 }
    )
  } catch (error) {
    const dbErr = getDbErrorResponse(error)
    if (dbErr) return NextResponse.json(dbErr.body, { status: dbErr.status })
    console.error("Error creating recurring expense:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
