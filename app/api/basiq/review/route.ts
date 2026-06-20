import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type ReviewAction = {
  id: string
  action: "approve" | "dismiss"
  category?: string
  expenseCategory?: string
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { actions } = body as { actions: ReviewAction[] }

    if (!actions?.length) {
      return NextResponse.json({ error: "No actions provided" }, { status: 400 })
    }

    let approved = 0
    let dismissed = 0

    await prisma.$transaction(async (tx) => {
      for (const action of actions) {
        const expense = await tx.expense.findFirst({
          where: {
            id: action.id,
            userId: session.user.id,
            syncStatus: "pending_review",
          },
        })
        if (!expense) continue

        if (action.action === "dismiss") {
          await tx.expense.delete({ where: { id: action.id } })
          dismissed++
        } else {
          await tx.expense.update({
            where: { id: action.id },
            data: {
              syncStatus: "confirmed",
              ...(action.category && { category: action.category }),
              ...(action.expenseCategory && { expenseCategory: action.expenseCategory }),
            },
          })

          await tx.account.update({
            where: { id: expense.accountId },
            data: { balance: { decrement: expense.amount } },
          })

          approved++
        }
      }
    })

    return NextResponse.json({ approved, dismissed })
  } catch (error) {
    console.error("Basiq review error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
