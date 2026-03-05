import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isWithinRange(date: Date, start: Date, end?: Date | null): boolean {
  const d = startOfDay(date)
  const s = startOfDay(start)
  if (end) {
    const e = startOfDay(end)
    return d >= s && d <= e
  }
  return d >= s
}

function isDueToday(recurring: { frequency: string; startDate: Date; endDate: Date | null }, today: Date): boolean {
  const start = startOfDay(recurring.startDate)
  const t = startOfDay(today)

  if (!isWithinRange(t, start, recurring.endDate)) {
    return false
  }

  switch (recurring.frequency) {
    case "weekly": {
      const msPerDay = 24 * 60 * 60 * 1000
      const diffDays = Math.floor((t.getTime() - start.getTime()) / msPerDay)
      return diffDays >= 0 && diffDays % 7 === 0
    }
    case "monthly": {
      // Run on the same day-of-month as the start date
      return t.getDate() === start.getDate()
    }
    case "yearly": {
      return (
        t.getMonth() === start.getMonth() &&
        t.getDate() === start.getDate()
      )
    }
    default:
      return false
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const dateParam = url.searchParams.get("date")
    const today = startOfDay(dateParam ? new Date(dateParam) : new Date())

    const recurringList = await prisma.recurringExpense.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      include: {
        account: true,
      },
    })

    const processedIds: string[] = []
    const skippedInsufficient: string[] = []

    for (const recurring of recurringList) {
      if (!isDueToday(recurring, today)) {
        continue
      }

      // Check if an expense that looks like this recurring has already been logged for today
      const existing = await prisma.expense.findFirst({
        where: {
          userId: session.user.id,
          accountId: recurring.accountId,
          amount: recurring.amount,
          description: recurring.description,
          category: recurring.category,
          expenseCategory: recurring.expenseCategory,
          date: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      })

      if (existing) {
        continue
      }

      const account = await prisma.account.findFirst({
        where: { id: recurring.accountId, userId: session.user.id },
      })
      if (!account) {
        continue
      }
      if (account.balance < recurring.amount) {
        skippedInsufficient.push(recurring.id)
        continue
      }

      const expense = await prisma.$transaction(async (tx) => {
        const created = await tx.expense.create({
          data: {
            userId: session.user.id,
            accountId: recurring.accountId,
            amount: recurring.amount,
            description: recurring.description,
            category: recurring.category,
            expenseCategory: recurring.expenseCategory,
            date: today,
          },
          include: {
            account: { select: { id: true, name: true, bankName: true } },
          },
        })
        await tx.account.update({
          where: { id: recurring.accountId },
          data: { balance: { decrement: recurring.amount } },
        })
        return created
      })

      if (expense) {
        processedIds.push(recurring.id)
      }
    }

    return NextResponse.json({
      processedCount: processedIds.length,
      processedIds,
      skippedInsufficient,
    })
  } catch (error) {
    console.error("Error processing due recurring expenses:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

