import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { coerceMinor } from "@/lib/money"

const MAX_CATCHUP_DAYS = 90
const MS_PER_DAY = 24 * 60 * 60 * 1000

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY)
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

type RecurringSchedule = {
  frequency: string
  startDate: Date
  endDate: Date | null
}

function getDueDatesBetween(
  recurring: RecurringSchedule,
  afterDate: Date,
  upToDate: Date,
): Date[] {
  const start = startOfDay(recurring.startDate)
  const after = startOfDay(afterDate)
  const upTo = startOfDay(upToDate)
  const dates: Date[] = []

  if (upTo < start) return dates

  switch (recurring.frequency) {
    case "weekly": {
      const diffMs = after.getTime() - start.getTime()
      const diffDays = Math.floor(diffMs / MS_PER_DAY)
      const weeksElapsed = Math.max(0, Math.ceil(diffDays / 7))
      let candidate = new Date(start.getTime() + weeksElapsed * 7 * MS_PER_DAY)
      candidate = startOfDay(candidate)
      if (candidate.getTime() <= after.getTime()) {
        candidate = startOfDay(addDays(candidate, 7))
      }
      while (candidate.getTime() <= upTo.getTime()) {
        if (isWithinRange(candidate, start, recurring.endDate)) {
          dates.push(startOfDay(candidate))
        }
        candidate = startOfDay(addDays(candidate, 7))
      }
      break
    }
    case "monthly": {
      const targetDay = start.getDate()
      let year = after.getFullYear()
      let month = after.getMonth()
      let candidate = startOfDay(new Date(year, month, targetDay))
      if (candidate.getTime() <= after.getTime()) {
        month++
        if (month > 11) {
          month = 0
          year++
        }
      }
      for (let i = 0; i < 100; i++) {
        candidate = startOfDay(new Date(year, month, targetDay))
        if (candidate.getDate() !== targetDay) {
          month++
          if (month > 11) {
            month = 0
            year++
          }
          continue
        }
        if (candidate.getTime() > upTo.getTime()) break
        if (isWithinRange(candidate, start, recurring.endDate)) {
          dates.push(new Date(candidate))
        }
        month++
        if (month > 11) {
          month = 0
          year++
        }
      }
      break
    }
    case "yearly": {
      const targetMonth = start.getMonth()
      const targetDay = start.getDate()
      let year = after.getFullYear()
      let candidate = startOfDay(new Date(year, targetMonth, targetDay))
      if (candidate.getTime() <= after.getTime()) {
        year++
      }
      for (let i = 0; i < 100; i++) {
        candidate = startOfDay(new Date(year, targetMonth, targetDay))
        if (candidate.getTime() > upTo.getTime()) break
        if (isWithinRange(candidate, start, recurring.endDate)) {
          dates.push(new Date(candidate))
        }
        year++
      }
      break
    }
  }

  return dates
}

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

    // If never processed, only check today (no retroactive bulk catch-up).
    // If last processed, catch up from that date to today.
    const catchupFrom = lastRun
      ? lastRun < earliestCatchup
        ? earliestCatchup
        : lastRun
      : addDays(today, -1)

    const dueDates = getDueDatesBetween(recurring, catchupFrom, today)
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

    // The account was already loaded with the recurring row (include above);
    // don't refetch it for every due date.
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
        // Atomic check-and-decrement so concurrent runs can't overdraw.
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
      `Cron [recurring-expenses]: checked ${result.totalChecked} recurring expense(s) — ${result.processedCount} created, ${result.skippedInsufficient.length} skipped (insufficient balance), ${result.alreadyLogged} already logged, ${result.nothingDue} not due`,
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
