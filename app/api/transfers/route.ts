import { NextResponse } from "next/server"
import { moneyJsonResponse } from "@/lib/api-money-response"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { parseMoneyFromApi } from "@/lib/money-api"
import {
  ACCOUNT_MONEY_FIELDS,
  AMOUNT_ONLY_FIELDS,
  mapMoneyFieldsToApi,
  mapMoneyListToApi,
} from "@/lib/money-serialize"
import { currencyFromSession } from "@/lib/user-currency"

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = currencyFromSession(session.user.displayCurrency)
    const { fromAccountId, toAccountId, amount, description, date, category } =
      await request.json()

    if (!fromAccountId || !toAccountId || amount == null) {
      return NextResponse.json(
        { error: "From account, to account, and amount are required" },
        { status: 400 }
      )
    }

    if (fromAccountId === toAccountId) {
      return NextResponse.json(
        { error: "Cannot transfer to the same account" },
        { status: 400 }
      )
    }

    let amountMinor: bigint
    try {
      amountMinor = parseMoneyFromApi(amount, currency)
    } catch {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      )
    }
    if (amountMinor <= 0n) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      )
    }

    const [fromAccount, toAccount] = await Promise.all([
      prisma.account.findFirst({
        where: { id: fromAccountId, userId: session.user.id },
      }),
      prisma.account.findFirst({
        where: { id: toAccountId, userId: session.user.id },
      }),
    ])

    if (!fromAccount || !toAccount) {
      return NextResponse.json(
        { error: "One or both accounts not found" },
        { status: 404 }
      )
    }

    if (fromAccount.balance < amountMinor) {
      return NextResponse.json(
        { error: "Insufficient funds" },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: fromAccountId },
        data: { balance: { decrement: amountMinor } },
      })

      await tx.account.update({
        where: { id: toAccountId },
        data: { balance: { increment: amountMinor } },
      })

      return tx.transfer.create({
        data: {
          userId: session.user.id,
          fromAccountId,
          toAccountId,
          amount: amountMinor,
          description: description || null,
          category: category || null,
          date: date ? new Date(date) : new Date(),
        },
        include: {
          fromAccount: true,
          toAccount: true,
        },
      })
    })

    const transfer = mapMoneyFieldsToApi(
      result as unknown as Record<string, unknown>,
      currency,
      AMOUNT_ONLY_FIELDS
    )
    if (transfer.fromAccount) {
      transfer.fromAccount = mapMoneyFieldsToApi(
        transfer.fromAccount as Record<string, unknown>,
        currency,
        ACCOUNT_MONEY_FIELDS
      )
    }
    if (transfer.toAccount) {
      transfer.toAccount = mapMoneyFieldsToApi(
        transfer.toAccount as Record<string, unknown>,
        currency,
        ACCOUNT_MONEY_FIELDS
      )
    }

    return moneyJsonResponse({ transfer }, currency, { status: 201 })
  } catch (error) {
    console.error("Error creating transfer:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = currencyFromSession(session.user.displayCurrency)
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const where: {
      userId: string
      date?: { gte?: Date; lte?: Date }
    } = {
      userId: session.user.id,
    }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(endDate)
    }

    const transfers = await prisma.transfer.findMany({
      where,
      include: {
        fromAccount: true,
        toAccount: true,
      },
      orderBy: { date: "desc" },
      take: 200,
    })

    const transfersOut = transfers.map((t) => {
      const row = mapMoneyFieldsToApi(
        t as unknown as Record<string, unknown>,
        currency,
        AMOUNT_ONLY_FIELDS
      )
      row.fromAccount = mapMoneyFieldsToApi(
        t.fromAccount as unknown as Record<string, unknown>,
        currency,
        ACCOUNT_MONEY_FIELDS
      )
      row.toAccount = mapMoneyFieldsToApi(
        t.toAccount as unknown as Record<string, unknown>,
        currency,
        ACCOUNT_MONEY_FIELDS
      )
      return row
    })

    return moneyJsonResponse({ transfers: transfersOut }, currency)
  } catch (error) {
    console.error("Error fetching transfers:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
