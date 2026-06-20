import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { currencyFromSession } from "@/lib/user-currency"
import { serializeMoneyForApi } from "@/lib/money-api"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = currencyFromSession(session.user.displayCurrency)

    const pending = await prisma.expense.findMany({
      where: {
        userId: session.user.id,
        source: "basiq",
        syncStatus: "pending_review",
      },
      include: {
        account: { select: { name: true, bankName: true } },
      },
      orderBy: { date: "desc" },
      take: 100,
    })

    const count = await prisma.expense.count({
      where: {
        userId: session.user.id,
        source: "basiq",
        syncStatus: "pending_review",
      },
    })

    return NextResponse.json({
      pending: pending.map((e) => ({
        id: e.id,
        type: "expense" as const,
        amount: serializeMoneyForApi(e.amount, currency),
        description: e.description,
        date: e.date.toISOString(),
        account: e.account?.name ?? "Unknown",
        autoCategory: e.category,
        autoExpenseCategory: e.expenseCategory,
        syncStatus: e.syncStatus,
      })),
      count,
    })
  } catch (error) {
    console.error("Basiq pending error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
