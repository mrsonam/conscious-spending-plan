import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { prismaSubscription } from "@/lib/prisma-subscription"
import {
  collectUpcomingEvents,
  monthlyEquivalent,
  type SubscriptionFrequency,
} from "@/lib/subscription-utils"
import { getDbErrorResponse } from "@/lib/db-error"
import { getExchangeRate } from "@/lib/fx-rate"

const VALID_FREQ = ["weekly", "monthly", "yearly"] as const
const VALID_STATUS = ["active", "paused", "cancelled"] as const

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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

    // --- FX Processing ---
    const currencies = new Set<string>()
    for (const s of rawSubscriptions) {
      const fc = (s as any).foreignCurrency
      if (fc && typeof fc === 'string') currencies.add(fc.toUpperCase())
    }

    const fxMap: Record<string, number> = {}
    if (currencies.size > 0) {
      await Promise.all(
        Array.from(currencies).map(async (curr) => {
          fxMap[curr] = await getExchangeRate(curr, "AUD")
        })
      )
    }

    const subscriptions = rawSubscriptions.map((s) => {
      const sub = s as any
      if (sub.foreignCurrency && sub.foreignAmount) {
        const rate = fxMap[sub.foreignCurrency.toUpperCase()] || 1
        return {
          ...sub,
          recurringExpense: {
            ...sub.recurringExpense,
            // Dynamically evaluate local amount based on FX rate
            amount: sub.foreignAmount * rate
          }
        }
      }
      return sub
    })
    // -----------------------

    const activeForTotals = subscriptions.filter(
      (s) => s.status === "active" && s.recurringExpense.isActive
    )
    let monthlyActiveTotal = 0
    for (const s of activeForTotals) {
      const f = s.recurringExpense.frequency as SubscriptionFrequency
      if (["weekly", "monthly", "yearly"].includes(f)) {
        monthlyActiveTotal += monthlyEquivalent(s.recurringExpense.amount, f)
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
          amount: s.recurringExpense.amount, // Now reflects local FX rate
          frequency: s.recurringExpense.frequency,
          startDate: s.recurringExpense.startDate,
          isActive: s.recurringExpense.isActive,
          description: s.recurringExpense.description,
        },
      })),
      upcomingDays
    )

    return NextResponse.json(
      {
        subscriptions,
        monthlyActiveTotal,
        upcoming,
        upcomingDays,
      },
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

    const body = await request.json()
    const {
      accountId,
      amount,
      description,
      category,
      expenseCategory,
      frequency,
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

    if (!accountId || !amount || Number(amount) <= 0 || !frequency) {
      return NextResponse.json(
        { error: "Account, amount, and frequency are required" },
        { status: 400 }
      )
    }

    if (!VALID_FREQ.includes(frequency)) {
      return NextResponse.json(
        { error: "Frequency must be weekly, monthly, or yearly" },
        { status: 400 }
      )
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

    const result = await prisma.$transaction(async (tx) => {
      const recurring = await tx.recurringExpense.create({
        data: {
          userId: session.user.id,
          accountId,
          amount: Number(amount), // Local projected amount Fallback
          description: description || null,
          category: category || null,
          expenseCategory: expenseCategory || null,
          frequency,
          startDate: startDate ? new Date(startDate) : new Date(),
          endDate: endDate ? new Date(endDate) : null,
          isActive: true,
        },
        include: {
          account: { select: { id: true, name: true, bankName: true } },
        },
      })

      const subscription = await (tx as any).subscription.create({
        data: {
          userId: session.user.id,
          recurringExpenseId: recurring.id,
          provider: typeof provider === "string" ? provider.trim() || null : null,
          label: typeof label === "string" ? label.trim() || null : null,
          status: st,
          trialEndsAt: trialEndsAt ? new Date(trialEndsAt) : null,
          nextRenewalAt: nextRenewalAt ? new Date(nextRenewalAt) : null,
          reminderDaysBefore: rb,
          foreignCurrency: typeof foreignCurrency === "string" && foreignCurrency ? foreignCurrency.toUpperCase() : null,
          foreignAmount: typeof foreignAmount === "number" ? foreignAmount : null,
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

    return NextResponse.json({ subscription: result }, { status: 201 })
  } catch (error) {
    const dbErr = getDbErrorResponse(error)
    if (dbErr) return NextResponse.json(dbErr.body, { status: dbErr.status })
    console.error("Error creating subscription:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
