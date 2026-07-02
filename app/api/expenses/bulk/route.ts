import { NextResponse } from "next/server"
import { moneyJsonResponse } from "@/lib/api-money-response"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getDbErrorResponse } from "@/lib/db-error"
import { parseMoneyFromApi, serializeMoneyForApi } from "@/lib/money-api"
import { mapMoneyListToApi, AMOUNT_ONLY_FIELDS } from "@/lib/money-serialize"
import { currencyFromSession } from "@/lib/user-currency"
import { addMinor, coerceMinor } from "@/lib/money"

type BulkRow = {
  amount: unknown
  description?: string | null
  category?: string | null
  expenseCategory?: string | null
  date?: string
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = currencyFromSession(session.user.displayCurrency)
    const body = await request.json()
    const { accountId: bodyAccountId, expenses: rawExpenses } = body as {
      accountId?: string
      expenses: BulkRow[]
    }

    if (!Array.isArray(rawExpenses) || rawExpenses.length === 0) {
      return NextResponse.json(
        { error: "expenses array is required and must not be empty" },
        { status: 400 }
      )
    }
    if (rawExpenses.length > 500) {
      return NextResponse.json(
        { error: "At most 500 expenses can be imported at once" },
        { status: 400 }
      )
    }

    let accountId = bodyAccountId
    if (!accountId) {
      const defaultAccount = await prisma.account.findFirst({
        where: { userId: session.user.id, isDefault: true },
      })
      const firstAccount = await prisma.account.findFirst({
        where: { userId: session.user.id },
      })
      accountId = defaultAccount?.id ?? firstAccount?.id ?? undefined
    }

    if (!accountId) {
      return NextResponse.json(
        { error: "No account found. Create an account first." },
        { status: 400 }
      )
    }

    const account = await prisma.account.findFirst({
      where: { id: accountId, userId: session.user.id },
    })

    if (!account) {
      return NextResponse.json(
        { error: "Account not found or does not belong to user" },
        { status: 404 }
      )
    }

    const today = new Date().toISOString().slice(0, 10)
    const rows: { amountMinor: bigint; description: string | null; category: string | null; expenseCategory: string | null; date: string }[] = []

    for (const r of rawExpenses) {
      let amountMinor: bigint
      try {
        amountMinor = parseMoneyFromApi(r.amount, currency)
      } catch {
        return NextResponse.json(
          { error: "Every row must have a valid positive amount" },
          { status: 400 }
        )
      }
      if (amountMinor <= 0n) {
        return NextResponse.json(
          { error: "Every row must have a valid positive amount" },
          { status: 400 }
        )
      }
      rows.push({
        amountMinor,
        description: r.description ?? null,
        category: r.category ?? null,
        expenseCategory: r.expenseCategory ?? null,
        date: r.date ?? today,
      })
    }

    const totalMinor = rows.reduce((sum, r) => addMinor(sum, r.amountMinor), 0n)
    const accountBalance = coerceMinor(account.balance)
    if (accountBalance < totalMinor) {
      return NextResponse.json(
        {
          error: `Insufficient funds. Total is ${serializeMoneyForApi(totalMinor, currency).toFixed(2)} but account balance is ${serializeMoneyForApi(accountBalance, currency).toFixed(2)}.`,
        },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(
      async (tx) => {
        // Atomic check-and-decrement: WHERE balance >= total prevents overdraft
        // under concurrent requests (the pre-check above is only a fast path).
        const updated = await tx.account.updateMany({
          where: { id: accountId, balance: { gte: totalMinor } },
          data: { balance: { decrement: totalMinor } },
        })
        if (updated.count === 0) throw new Error("INSUFFICIENT_FUNDS")

        const created = await Promise.all(
          rows.map((r) =>
            tx.expense.create({
              data: {
                userId: session.user.id,
                accountId,
                amount: r.amountMinor,
                description: r.description,
                category: r.category,
                expenseCategory: r.expenseCategory,
                date: new Date(r.date),
              },
              select: {
                id: true,
                amount: true,
                description: true,
                date: true,
                category: true,
                expenseCategory: true,
              },
            })
          )
        )

        return { created, totalMinor }
      },
      { timeout: 60000 }
    )

    return moneyJsonResponse(
      {
        created: result.created.length,
        total: serializeMoneyForApi(result.totalMinor, currency),
        expenses: mapMoneyListToApi(
          result.created as unknown as Record<string, unknown>[],
          currency,
          AMOUNT_ONLY_FIELDS,
        ),
      },
      currency,
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_FUNDS") {
      return NextResponse.json({ error: "Insufficient funds in the account" }, { status: 400 })
    }
    const dbErr = getDbErrorResponse(error)
    if (dbErr) return NextResponse.json(dbErr.body, { status: dbErr.status })
    console.error("Bulk expenses error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
