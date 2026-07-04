import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { currencyFromSession } from "@/lib/user-currency"
import { serializeMoneyForApi } from "@/lib/money-api"
import { coerceMinor } from "@/lib/money"

const MS_PER_DAY = 24 * 60 * 60 * 1000

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, days: number): Date {
  return startOfDay(new Date(date.getTime() + days * MS_PER_DAY))
}

function dateKey(d: Date): string {
  return d.toISOString().split("T")[0]!
}

type RecurringSchedule = {
  frequency: string
  startDate: Date
  endDate: Date | null
  amount: bigint
  description: string | null
  expenseCategory: string | null
}

function isDueOn(r: RecurringSchedule, day: Date): boolean {
  const start = startOfDay(r.startDate)
  const d = startOfDay(day)
  if (d < start) return false
  if (r.endDate && d > startOfDay(r.endDate)) return false

  switch (r.frequency) {
    case "weekly": {
      const diff = Math.floor((d.getTime() - start.getTime()) / MS_PER_DAY)
      return diff >= 0 && diff % 7 === 0
    }
    case "monthly":
      return d.getDate() === start.getDate()
    case "yearly":
      return (
        d.getMonth() === start.getMonth() && d.getDate() === start.getDate()
      )
    default:
      return false
  }
}

function detectIncomePattern(
  incomeEntries: { amount: bigint; date: Date }[],
  lookbackMonths: number,
): { dayOfMonth: number; averageAmount: bigint }[] {
  if (incomeEntries.length === 0) return []

  // Actual average monthly income, this is the ceiling
  let totalIncome = 0n
  for (const entry of incomeEntries) {
    totalIncome += coerceMinor(entry.amount)
  }
  const avgMonthly = totalIncome / BigInt(Math.max(1, lookbackMonths))

  // Find which days-of-month income typically arrives
  const dayBuckets = new Map<number, { total: bigint; count: number }>()
  for (const entry of incomeEntries) {
    const day = entry.date.getDate()
    const bucket = dayBuckets.get(day) ?? { total: 0n, count: 0 }
    bucket.total += coerceMinor(entry.amount)
    bucket.count += 1
    dayBuckets.set(day, bucket)
  }

  const minOccurrences = Math.max(1, Math.floor(lookbackMonths / 3))
  const rawPatterns: { dayOfMonth: number; weight: bigint }[] = []
  let totalWeight = 0n

  for (const [day, bucket] of dayBuckets.entries()) {
    if (bucket.count >= minOccurrences) {
      const avg = bucket.total / BigInt(bucket.count)
      rawPatterns.push({ dayOfMonth: day, weight: avg })
      totalWeight += avg
    }
  }

  if (rawPatterns.length === 0) return []

  // Distribute avgMonthly across detected paydays proportionally
  const patterns = rawPatterns.map((p) => ({
    dayOfMonth: p.dayOfMonth,
    averageAmount:
      totalWeight > 0n
        ? (avgMonthly * p.weight) / totalWeight
        : avgMonthly / BigInt(rawPatterns.length),
  }))

  patterns.sort((a, b) => a.dayOfMonth - b.dayOfMonth)
  return patterns
}

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const futureDays = Math.min(
      Math.max(parseInt(searchParams.get("days") ?? "90", 10), 14),
      180,
    )
    const pastDays = Math.min(
      Math.max(parseInt(searchParams.get("lookback") ?? "60", 10), 0),
      180,
    )
    const lookbackMonths = 6

    const currency = currencyFromSession(session.user.displayCurrency)
    const toD = (minor: bigint) => serializeMoneyForApi(minor, currency)

    const now = new Date()
    const today = startOfDay(now)
    const historyStart = addDays(today, -pastDays)
    const analysisStart = new Date(
      today.getFullYear(),
      today.getMonth() - lookbackMonths,
      1,
    )

    const [accounts, recurringExpenses, incomeEntries, allExpenses] =
      await Promise.all([
        prisma.account.findMany({
          where: { userId: session.user.id },
          select: { balance: true, accountType: true },
        }),
        prisma.recurringExpense.findMany({
          where: { userId: session.user.id, isActive: true },
          select: {
            amount: true,
            frequency: true,
            startDate: true,
            endDate: true,
            description: true,
            expenseCategory: true,
          },
        }),
        prisma.incomeEntry.findMany({
          where: {
            userId: session.user.id,
            date: { gte: analysisStart, lte: now },
            excludeFromAllocation: false,
          },
          select: { amount: true, date: true },
          orderBy: { date: "asc" },
        }),
        prisma.expense.findMany({
          where: {
            userId: session.user.id,
            date: { gte: analysisStart, lte: now },
          },
          select: { amount: true, date: true, expenseCategory: true },
        }),
      ])

    // Current balance (checking + savings only)
    let currentBalance = 0n
    for (const acc of accounts) {
      if (acc.accountType === "checking" || acc.accountType === "savings") {
        currentBalance += coerceMinor(acc.balance)
      }
    }

    // Recurring expense schedules
    const schedules: RecurringSchedule[] = recurringExpenses.map(
      (r: {
        amount: bigint
        frequency: string
        startDate: Date
        endDate: Date | null
        description: string | null
        expenseCategory: string | null
      }) => ({
        frequency: r.frequency,
        startDate: r.startDate,
        endDate: r.endDate,
        amount: coerceMinor(r.amount) as bigint,
        description: r.description,
        expenseCategory: r.expenseCategory,
      }),
    )

    // Income patterns
    const incomePatterns = detectIncomePattern(incomeEntries, lookbackMonths)

    // Per-category daily expense rates (excluding recurring to avoid double-count)
    const categoryTotals = new Map<string, bigint>()
    for (const e of allExpenses) {
      const cat = e.expenseCategory ?? "other"
      categoryTotals.set(
        cat,
        (categoryTotals.get(cat) ?? 0n) + coerceMinor(e.amount),
      )
    }
    for (const r of schedules) {
      const cat = r.expenseCategory ?? "other"
      let recurringTotal = 0n
      switch (r.frequency) {
        case "weekly":
          recurringTotal = r.amount * BigInt(lookbackMonths * 4)
          break
        case "monthly":
          recurringTotal = r.amount * BigInt(lookbackMonths)
          break
        case "yearly":
          recurringTotal = r.amount
          break
      }
      const current = categoryTotals.get(cat) ?? 0n
      categoryTotals.set(
        cat,
        current > recurringTotal ? current - recurringTotal : 0n,
      )
    }
    const analysisLookbackDays = Math.max(
      1,
      Math.floor((today.getTime() - analysisStart.getTime()) / MS_PER_DAY),
    )
    let totalDailyExpenses = 0n
    const categoryDailyRates: { dailyAmount: bigint }[] = []
    for (const [, total] of categoryTotals.entries()) {
      if (total <= 0n) continue
      const daily = total / BigInt(analysisLookbackDays)
      if (daily <= 0n) continue
      categoryDailyRates.push({ dailyAmount: daily })
      totalDailyExpenses += daily
    }

    // --- Actual historical balances ---
    // Build daily net changes from real transactions in the past period
    const dailyIncomeMap = new Map<string, bigint>()
    for (const entry of incomeEntries) {
      const key = dateKey(startOfDay(entry.date))
      dailyIncomeMap.set(
        key,
        (dailyIncomeMap.get(key) ?? 0n) + coerceMinor(entry.amount),
      )
    }
    const dailyExpenseMap = new Map<string, bigint>()
    for (const entry of allExpenses) {
      const key = dateKey(startOfDay(entry.date))
      dailyExpenseMap.set(
        key,
        (dailyExpenseMap.get(key) ?? 0n) + coerceMinor(entry.amount),
      )
    }

    // Compute actual balance at historyStart by working backward from today
    // balance_at_past = currentBalance + expenses_between - income_between
    let actualBalanceAtStart = currentBalance
    for (let i = 0; i < pastDays; i++) {
      const day = addDays(today, -i)
      const key = dateKey(day)
      actualBalanceAtStart += dailyExpenseMap.get(key) ?? 0n
      actualBalanceAtStart -= dailyIncomeMap.get(key) ?? 0n
    }

    // --- Build timeline ---
    type TimelinePoint = {
      date: string
      actualBalance: number | null
      forecastBalance: number
      events: { type: string; label: string; amount: number }[]
    }
    const timeline: TimelinePoint[] = []

    // Forecast model: run from historyStart forward through today + futureDays
    let forecastBalance = actualBalanceAtStart
    let actualBalance = actualBalanceAtStart
    const totalDays = pastDays + futureDays

    for (let i = 0; i <= totalDays; i++) {
      const day = addDays(historyStart, i)
      const key = dateKey(day)
      const isPast = i < pastDays
      const isToday = i === pastDays
      const events: { type: string; label: string; amount: number }[] = []

      if (i > 0) {
        // --- Forecast model step ---
        for (const r of schedules) {
          if (isDueOn(r, day)) {
            forecastBalance -= r.amount
            events.push({
              type: "recurring",
              label: r.description || "Recurring expense",
              amount: toD(r.amount),
            })
          }
        }
        for (const pattern of incomePatterns) {
          if (day.getDate() === pattern.dayOfMonth) {
            forecastBalance += pattern.averageAmount
            events.push({
              type: "income",
              label: "Expected income",
              amount: toD(pattern.averageAmount),
            })
          }
        }
        for (const { dailyAmount } of categoryDailyRates) {
          forecastBalance -= dailyAmount
        }

        // --- Actual balance step (past only) ---
        if (isPast || isToday) {
          const dayIncome = dailyIncomeMap.get(key) ?? 0n
          const dayExpense = dailyExpenseMap.get(key) ?? 0n
          actualBalance += dayIncome
          actualBalance -= dayExpense
        }
      }

      timeline.push({
        date: key,
        actualBalance: isPast || isToday ? toD(actualBalance) : null,
        forecastBalance: toD(forecastBalance),
        events: !isPast ? events : [],
      })
    }

    // Summary
    let totalIncomeInLookback = 0n
    for (const entry of incomeEntries) {
      totalIncomeInLookback += coerceMinor(entry.amount)
    }
    const avgMonthlyIncome =
      lookbackMonths > 0
        ? totalIncomeInLookback / BigInt(lookbackMonths)
        : 0n

    return NextResponse.json(
      {
        currentBalance: toD(currentBalance),
        todayIndex: pastDays,
        timeline,
        summary: {
          avgMonthlyIncome: toD(avgMonthlyIncome),
          avgDailyExpenses: toD(totalDailyExpenses),
          recurringMonthly: toD(
            schedules.reduce((sum, r) => {
              switch (r.frequency) {
                case "weekly":
                  return sum + r.amount * 4n
                case "monthly":
                  return sum + r.amount
                case "yearly":
                  return sum + r.amount / 12n
                default:
                  return sum
              }
            }, 0n),
          ),
          incomePatterns: incomePatterns.map((p) => ({
            dayOfMonth: p.dayOfMonth,
            amount: toD(p.averageAmount),
          })),
        },
      },
      {
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
        },
      },
    )
  } catch (error) {
    console.error("Error computing cash flow forecast:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
