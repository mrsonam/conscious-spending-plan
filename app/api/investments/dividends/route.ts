import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/** Record a dividend payment credited to an investment account (cash in). */
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { investmentAccountId, name, amount, date } = body

    if (!investmentAccountId || !name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Investment account and stock name are required" },
        { status: 400 },
      )
    }

    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
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
          amount: numericAmount,
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
        data: { balance: { increment: numericAmount } },
      })

      const dividend = await tx.investmentDividend.create({
        data: {
          userId: session.user.id,
          accountId: investmentAccount.id,
          name: trimmedName,
          amount: numericAmount,
          date: dividendDate,
          incomeEntryId: incomeEntry.id,
        },
      })

      return { dividend, incomeEntryId: incomeEntry.id }
    })

    return NextResponse.json(
      { dividend: row.dividend, incomeEntryId: row.incomeEntryId },
      { status: 201 },
    )
  } catch (error: unknown) {
    console.error("Error recording dividend:", error)
    const message = error instanceof Error ? error.message : "Internal server error"
    const status = message === "Investment account not found" ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
