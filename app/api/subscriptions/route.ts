import { NextResponse } from "next/server"
import { moneyJsonResponse } from "@/lib/api-money-response"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { prismaSubscription } from "@/lib/prisma-subscription"
import {
  collectUpcomingEvents,
  monthlyEquivalent,
  SUPPORTED_SUBSCRIPTION_FREQUENCIES,
  type SubscriptionFrequency,
} from "@/lib/subscription-utils"
import { validateRecurringSchedule } from "@/lib/recurring-expense-schedule"
import { getDbErrorResponse } from "@/lib/db-error"
import { getExchangeRate } from "@/lib/fx-rate"
import { parseMoneyFromApi, serializeMoneyForApi } from "@/lib/money-api"
import { mapMoneyFieldsToApi, AMOUNT_ONLY_FIELDS } from "@/lib/money-serialize"
import { currencyFromSession } from "@/lib/user-currency"
import { dollarsToMinor } from "@/lib/money"

const VALID_FREQ = SUPPORTED_SUBSCRIPTION_FREQUENCIES
const VALID_STATUS = ["active", "paused", "cancelled"] as const

type SubscriptionRow = {
  id: string
  label: string | null
  provider: string | null
  status: string
  trialEndsAt: Date | null
  nextRenewalAt: Date | null
  reminderDaysBefore: number
  foreignCurrency: string | null
  foreignAmount: bigint | null
  recurringExpense: {
    amount: bigint
    frequency: string
    startDate: Date
    isActive: boolean
    description: string | null
    intervalDays?: number | null
    account?: { id: string; name: string; bankName: string }
  }
}

function subscriptionToApi(sub: SubscriptionRow, currency: string) {
  const rec = mapMoneyFieldsToApi(
    { ...sub.recurringExpense } as Record<string, unknown>,
    currency,
    AMOUNT_ONLY_FIELDS,
  )
  return {
    ...sub,
    foreignAmount:
      sub.foreignAmount != null
        ? serializeMoneyForApi(
            sub.foreignAmount,
            sub.foreignCurrency ?? currency,
          )
        : null,
    recurringExpense: {
      ...rec,
      amount: serializeMoneyForApi(sub.recurringExpense.amount, currency),
      frequency: sub.recurringExpense.frequency,
      startDate: sub.recurringExpense.startDate,
      isActive: sub.recurringExpense.isActive,
      description: sub.recurringExpense.description,
      intervalDays: sub.recurringExpense.intervalDays ?? null,
      account: sub.recurringExpense.account,
    },
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = currencyFromSession(session.user.displayCurrency)
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get("status")
    const upcomingDays = Math.min(
      90,
      Math.max(1, parseInt(searchParams.get("upcomingDays") || "14", 10) || 14)
    )

    const where: { userId: string; status?: string } = {
      userId: session.user.id,
    }
    if (statusFilter && VALID_STATUS.includes(statusFilter as (typeof VALID_STATUS)[number])) {
      where.status = statusFilter
    }

    const rawSubscriptions = await prismaSubscription.findMany({
      where,
      include: {
        recurringExpense: {
          include: {
            account: { select: { id: true, name: true, bankName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const currencies = new Set<string>()
    for (const s of rawSubscriptions) {
      if (s.foreignCurrency) currencies.add(s.foreignCurrency.toUpperCase())
    }

    const fxMap: Record<string, number> = {}
    if (currencies.size > 0) {
      await Promise.all(
        Array.from(currencies).map(async (curr) => {
          fxMap[curr] = await getExchangeRate(curr, currency)
        })
      )
    }

    const subscriptions = rawSubscriptions.map((s) => {
      let amountMinor = s.recurringExpense.amount
      if (s.foreignCurrency && s.foreignAmount != null) {
        const rate = fxMap[s.foreignCurrency.toUpperCase()] || 1
        const foreignDollars = serializeMoneyForApi(
          s.foreignAmount,
          s.foreignCurrency,
        )
        amountMinor = dollarsToMinor(foreignDollars * rate, currency)
      }
      const withAmount = {
        ...s,
        recurringExpense: { ...s.recurringExpense, amount: amountMinor },
      }
      return subscriptionToApi(withAmount as SubscriptionRow, currency)
    })

    const activeForTotals = subscriptions.filter(
      (s) => s.status === "active" && s.recurringExpense.isActive
    )
    let monthlyActiveTotal = 0
    for (const s of activeForTotals) {
      const f = s.recurringExpense.frequency as SubscriptionFrequency
      const amountDollars = s.recurringExpense.amount
      if (SUPPORTED_SUBSCRIPTION_FREQUENCIES.includes(f)) {
        monthlyActiveTotal += monthlyEquivalent(
          amountDollars,
          f,
          s.recurringExpense.intervalDays,
        )
      }
    }

    const upcoming = collectUpcomingEvents(
      subscriptions.map((s) => ({
        id: s.id,
        label: s.label,
        provider: s.provider,
        status: s.status,
        trialEndsAt: s.trialEndsAt,
        nextRenewalAt: s.nextRenewalAt,
        reminderDaysBefore: s.reminderDaysBefore,
        recurringExpense: {
          amount: s.recurringExpense.amount,
          frequency: s.recurringExpense.frequency,
          startDate: s.recurringExpense.startDate,
          isActive: s.recurringExpense.isActive,
          description: s.recurringExpense.description,
          intervalDays: s.recurringExpense.intervalDays ?? null,
        },
      })),
      upcomingDays
    )

    return moneyJsonResponse(
      {
        subscriptions,
        monthlyActiveTotal,
        upcoming,
        upcomingDays,
      },
      currency,
      {
        headers: {
          "Cache-Control": "private, max-age=20, stale-while-revalidate=60",
        },
      }
    )
  } catch (error) {
    const dbErr = getDbErrorResponse(error)
    if (dbErr) return NextResponse.json(dbErr.body, { status: dbErr.status })
    console.error("Error fetching subscriptions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = currencyFromSession(session.user.displayCurrency)
    const body = await request.json()
    const {
      accountId,
      amount,
      description,
      category,
      expenseCategory,
      frequency,
      intervalDays,
      startDate,
      endDate,
      provider,
      label,
      trialEndsAt,
      nextRenewalAt,
      reminderDaysBefore,
      status,
      foreignCurrency,
      foreignAmount,
    } = body

    if (!accountId || amount == null || !frequency) {
      return NextResponse.json(
        { error: "Account, amount, and frequency are required" },
        { status: 400 }
      )
    }

    let amountMinor: bigint
    try {
      amountMinor = parseMoneyFromApi(amount, currency)
    } catch {
      return NextResponse.json(
        { error: "Account, amount, and frequency are required" },
        { status: 400 }
      )
    }
    if (amountMinor <= 0n) {
      return NextResponse.json(
        { error: "Account, amount, and frequency are required" },
        { status: 400 }
      )
    }

    if (!VALID_FREQ.includes(frequency)) {
      return NextResponse.json(
        { error: "Frequency must be weekly, fortnightly, monthly, yearly, or custom" },
        { status: 400 }
      )
    }

    const parsedIntervalDays =
      intervalDays != null ? Math.floor(Number(intervalDays)) : null
    const scheduleCheck = validateRecurringSchedule(frequency, parsedIntervalDays)
    if (!scheduleCheck.ok) {
      return NextResponse.json({ error: scheduleCheck.error }, { status: 400 })
    }

    const st = VALID_STATUS.includes(status as (typeof VALID_STATUS)[number])
      ? status
      : "active"

    const account = await prisma.account.findFirst({
      where: { id: accountId, userId: session.user.id },
    })
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    const rb =
      typeof reminderDaysBefore === "number" && reminderDaysBefore >= 0 && reminderDaysBefore <= 90
        ? Math.floor(reminderDaysBefore)
        : 7

    let foreignAmountMinor: bigint | null = null
    if (foreignAmount != null && foreignCurrency) {
      try {
        foreignAmountMinor = parseMoneyFromApi(
          foreignAmount,
          String(foreignCurrency).toUpperCase(),
        )
      } catch {
        foreignAmountMinor = null
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const recurring = await tx.recurringExpense.create({
        data: {
          userId: session.user.id,
          accountId,
          amount: amountMinor,
          description: description || null,
          category: category || null,
          expenseCategory: expenseCategory || null,
          frequency,
          intervalDays: frequency === "custom" ? parsedIntervalDays : null,
          startDate: startDate ? new Date(startDate) : new Date(),
          endDate: endDate ? new Date(endDate) : null,
          isActive: true,
        },
        include: {
          account: { select: { id: true, name: true, bankName: true } },
        },
      })

      const subscription = await (tx as { subscription: { create: (args: object) => Promise<unknown> } }).subscription.create({
        data: {
          userId: session.user.id,
          recurringExpenseId: recurring.id,
          provider: typeof provider === "string" ? provider.trim() || null : null,
          label: typeof label === "string" ? label.trim() || null : null,
          status: st,
          trialEndsAt: trialEndsAt ? new Date(trialEndsAt) : null,
          nextRenewalAt: nextRenewalAt ? new Date(nextRenewalAt) : null,
          reminderDaysBefore: rb,
          foreignCurrency:
            typeof foreignCurrency === "string" && foreignCurrency
              ? foreignCurrency.toUpperCase()
              : null,
          foreignAmount: foreignAmountMinor,
        },
        include: {
          recurringExpense: {
            include: {
              account: { select: { id: true, name: true, bankName: true } },
            },
          },
        },
      })

      return subscription
    })

    return moneyJsonResponse(
      {
        subscription: subscriptionToApi(
          result as unknown as SubscriptionRow,
          currency,
        ),
      },
      currency,
      { status: 201 }
    )
  } catch (error) {
    const dbErr = getDbErrorResponse(error)
    if (dbErr) return NextResponse.json(dbErr.body, { status: dbErr.status })
    console.error("Error creating subscription:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
