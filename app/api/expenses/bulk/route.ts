import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getDbErrorResponse } from "@/lib/db-error"

type BulkRow = {
  amount: number
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

    // Resolve account: use provided id or user's default (Smart Access) or first account
    let accountId = bodyAccountId
    if (!accountId) {
      const defaultAccount = await prisma.account.findFirst({
        where: { userId: session.user.id, isDefault: true },
      })
      const firstAccount = await prisma.account.findFirst({
        where: { userId: session.user.id },
      })
      accountId = defaultAccount?.id ?? firstAccount?.id ?? null
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
    const rows: BulkRow[] = rawExpenses.map((r) => ({
      amount: Number(r.amount),
      description: r.description ?? null,
      category: r.category ?? null,
      expenseCategory: r.expenseCategory ?? null,
      date: r.date ?? today,
    }))

    const invalid = rows.filter((r) => !Number.isFinite(r.amount) || r.amount <= 0)
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: "Every row must have a valid positive amount" },
        { status: 400 }
      )
    }

    const total = rows.reduce((sum, r) => sum + r.amount, 0)
    if (account.balance < total) {
      return NextResponse.json(
        {
          error: `Insufficient funds. Total is ${total.toFixed(2)} but account balance is ${account.balance.toFixed(2)}.`,
        },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const created = await Promise.all(
          rows.map((r) =>
            tx.expense.create({
              data: {
                userId: session.user.id,
                accountId,
                amount: r.amount,
                description: r.description,
                category: r.category,
                expenseCategory: r.expenseCategory,
                date: new Date(r.date!),
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

        await tx.account.update({
          where: { id: accountId },
          data: { balance: { decrement: total } },
        })

        return { created, total }
      },
      { timeout: 60000 }
    )

    return NextResponse.json(
      { created: result.created.length, total: result.total, expenses: result.created },
      { status: 201 }
    )
  } catch (error) {
    const dbErr = getDbErrorResponse(error)
    if (dbErr) return NextResponse.json(dbErr.body, { status: dbErr.status })
    console.error("Bulk expenses error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
