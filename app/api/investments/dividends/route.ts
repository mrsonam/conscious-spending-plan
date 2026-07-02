import { NextResponse } from "next/server"
import { moneyJsonResponse } from "@/lib/api-money-response"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { parseMoneyFromApi, serializeMoneyForApi } from "@/lib/money-api"
import { mapMoneyFieldsToApi, AMOUNT_ONLY_FIELDS } from "@/lib/money-serialize"
import { currencyFromSession } from "@/lib/user-currency"

/** Record a dividend payment credited to an investment account (cash in). */
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = currencyFromSession(session.user.displayCurrency)
    const body = await request.json()
    const { investmentAccountId, name, amount, date } = body

    if (!investmentAccountId || !name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Investment account and stock name are required" },
        { status: 400 },
      )
    }

    let amountMinor: bigint
    try {
      amountMinor = parseMoneyFromApi(amount, currency)
    } catch {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 })
    }
    if (amountMinor <= 0n) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 })
    }

    const dividendDate = date ? new Date(date) : new Date()
    if (Number.isNaN(dividendDate.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 })
    }

    const trimmedName = name.trim()
    if (!trimmedName) {
      return NextResponse.json({ error: "Stock name is required" }, { status: 400 })
    }

    const row = await prisma.$transaction(async (tx) => {
      const investmentAccount = await tx.account.findFirst({
        where: {
          id: investmentAccountId,
          userId: session.user.id,
          accountType: "investment",
        },
      })

      if (!investmentAccount) {
        throw new Error("Investment account not found")
      }

      const d = dividendDate
      const periodStart = new Date(d.getFullYear(), d.getMonth(), 1)
      const periodEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)

      const incomeEntry = await tx.incomeEntry.create({
        data: {
          userId: session.user.id,
          amount: amountMinor,
          description: `Dividend: ${trimmedName}`,
          date: dividendDate,
          periodStart,
          periodEnd,
          accountId: investmentAccount.id,
          excludeFromAllocation: true,
        },
      })

      await tx.account.update({
        where: { id: investmentAccount.id },
        data: { balance: { increment: amountMinor } },
      })

      const dividend = await tx.investmentDividend.create({
        data: {
          userId: session.user.id,
          accountId: investmentAccount.id,
          name: trimmedName,
          amount: amountMinor,
          date: dividendDate,
          incomeEntryId: incomeEntry.id,
        },
      })

      return { dividend, incomeEntryId: incomeEntry.id }
    })

    return moneyJsonResponse(
      {
        dividend: mapMoneyFieldsToApi(
          row.dividend as unknown as Record<string, unknown>,
          currency,
          AMOUNT_ONLY_FIELDS,
        ),
        incomeEntryId: row.incomeEntryId,
      },
      currency,
      { status: 201 },
    )
  } catch (error: unknown) {
    console.error("Error recording dividend:", error)
    const message = error instanceof Error ? error.message : ""
    // Only expose known, user-facing messages; anything else stays generic.
    if (message === "Investment account not found") {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
