import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { coerceMinor } from "@/lib/money"
import { getDueDatesBetween, startOfDay, addDays } from "@/lib/recurring-expense-schedule"

const MAX_CATCHUP_DAYS = 90
const MS_PER_DAY = 24 * 60 * 60 * 1000

async function processRecurringExpenses(userId?: string) {
  const today = startOfDay(new Date())
  const earliestCatchup = startOfDay(addDays(today, -MAX_CATCHUP_DAYS))

  const recurringList = await prisma.recurringExpense.findMany({
    where: {
      ...(userId ? { userId } : {}),
      isActive: true,
    },
    include: { account: true },
  })

  const created: { id: string; dates: string[] }[] = []
  const skippedInsufficient: {
    id: string
    description: string | null
    dates: string[]
  }[] = []
  let alreadyLogged = 0
  let nothingDue = 0

  for (const recurring of recurringList) {
    const lastRun = recurring.lastRunAt
      ? startOfDay(recurring.lastRunAt)
      : null

    const catchupFrom = lastRun
      ? lastRun < earliestCatchup
        ? earliestCatchup
        : lastRun
      : addDays(today, -1)

    const dueDates = getDueDatesBetween(
      {
        frequency: recurring.frequency,
        startDate: recurring.startDate,
        endDate: recurring.endDate,
        intervalDays: recurring.intervalDays,
      },
      catchupFrom,
      today,
    )
    if (dueDates.length === 0) {
      nothingDue++
      if (!lastRun) {
        await prisma.recurringExpense.update({
          where: { id: recurring.id },
          data: { lastRunAt: today },
        })
      }
      continue
    }

    const amountMinor = coerceMinor(recurring.amount)
    const createdDates: string[] = []
    const insufficientDates: string[] = []

    const account = recurring.account
    if (!account || account.userId !== recurring.userId) {
      await prisma.recurringExpense.update({
        where: { id: recurring.id },
        data: { lastRunAt: today },
      })
      continue
    }

    for (const dueDate of dueDates) {
      const dayStart = startOfDay(dueDate)
      const dayEnd = new Date(dayStart.getTime() + MS_PER_DAY)
      const dateStr = dayStart.toISOString().split("T")[0]!

      const existing = await prisma.expense.findFirst({
        where: {
          userId: recurring.userId,
          accountId: recurring.accountId,
          amount: amountMinor,
          description: recurring.description,
          category: recurring.category,
          expenseCategory: recurring.expenseCategory,
          date: { gte: dayStart, lt: dayEnd },
        },
        select: { id: true },
      })
      if (existing) {
        alreadyLogged++
        continue
      }

      const createdOk = await prisma.$transaction(async (tx) => {
        const updated = await tx.account.updateMany({
          where: { id: recurring.accountId, balance: { gte: amountMinor } },
          data: { balance: { decrement: amountMinor } },
        })
        if (updated.count === 0) return false
        await tx.expense.create({
          data: {
            userId: recurring.userId,
            accountId: recurring.accountId,
            amount: amountMinor,
            description: recurring.description,
            category: recurring.category,
            expenseCategory: recurring.expenseCategory,
            date: dayStart,
          },
        })
        return true
      })

      if (!createdOk) {
        insufficientDates.push(dateStr)
        continue
      }

      createdDates.push(dateStr)
    }

    await prisma.recurringExpense.update({
      where: { id: recurring.id },
      data: { lastRunAt: today },
    })

    if (createdDates.length > 0) {
      created.push({ id: recurring.id, dates: createdDates })
    }
    if (insufficientDates.length > 0) {
      skippedInsufficient.push({
        id: recurring.id,
        description: recurring.description,
        dates: insufficientDates,
      })
    }
  }

  const processedCount = created.reduce((sum, p) => sum + p.dates.length, 0)

  if (skippedInsufficient.length > 0) {
    console.warn(
      `Recurring expenses skipped (insufficient balance): ${JSON.stringify(skippedInsufficient)}`,
    )
  }

  return {
    totalChecked: recurringList.length,
    processedCount,
    alreadyLogged,
    nothingDue,
    created,
    skippedInsufficient,
  }
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (
      !process.env.CRON_SECRET ||
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await processRecurringExpenses()
    console.log(
      `Cron [recurring-expenses]: checked ${result.totalChecked} recurring expense(s), ${result.processedCount} created, ${result.skippedInsufficient.length} skipped (insufficient balance), ${result.alreadyLogged} already logged, ${result.nothingDue} not due`,
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error("Cron error processing recurring expenses:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await processRecurringExpenses(session.user.id)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error processing due recurring expenses:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
