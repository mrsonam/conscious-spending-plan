import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { prismaSubscription } from "@/lib/prisma-subscription"
import { getDbErrorResponse } from "@/lib/db-error"

const VALID_STATUS = ["active", "paused", "cancelled"] as const
const VALID_FREQ = ["weekly", "monthly", "yearly"] as const

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const existing = await prismaSubscription.findFirst({
      where: { id, userId: session.user.id },
      include: { recurringExpense: true },
    })
    if (!existing) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
    }

    const body = await request.json()
    const {
      provider,
      label,
      status,
      trialEndsAt,
      nextRenewalAt,
      reminderDaysBefore,
      recurring,
      foreignCurrency,
      foreignAmount,
    } = body

    if (
      status != null &&
      !VALID_STATUS.includes(status as (typeof VALID_STATUS)[number])
    ) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    if (
      recurring?.frequency != null &&
      !VALID_FREQ.includes(recurring.frequency)
    ) {
      return NextResponse.json({ error: "Invalid frequency" }, { status: 400 })
    }

    if (recurring?.accountId != null) {
      const acc = await prisma.account.findFirst({
        where: { id: recurring.accountId, userId: session.user.id },
      })
      if (!acc) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 })
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (recurring && typeof recurring === "object") {
        await tx.recurringExpense.update({
          where: { id: existing.recurringExpenseId },
          data: {
            ...(recurring.accountId != null && { accountId: recurring.accountId }),
            ...(recurring.amount != null &&
              Number(recurring.amount) > 0 && { amount: Number(recurring.amount) }),
            ...(recurring.description !== undefined && {
              description: recurring.description || null,
            }),
            ...(recurring.category !== undefined && {
              category: recurring.category || null,
            }),
            ...(recurring.expenseCategory !== undefined && {
              expenseCategory: recurring.expenseCategory || null,
            }),
            ...(recurring.frequency != null && { frequency: recurring.frequency }),
            ...(recurring.startDate != null && {
              startDate: new Date(recurring.startDate),
            }),
            ...(recurring.endDate !== undefined && {
              endDate: recurring.endDate ? new Date(recurring.endDate) : null,
            }),
            ...(typeof recurring.isActive === "boolean" && {
              isActive: recurring.isActive,
            }),
          },
        })
      }

      return (tx as any).subscription.update({
        where: { id },
        data: {
          ...(provider !== undefined && {
            provider: typeof provider === "string" ? provider.trim() || null : null,
          }),
          ...(label !== undefined && {
            label: typeof label === "string" ? label.trim() || null : null,
          }),
          ...(status != null && { status }),
          ...(trialEndsAt !== undefined && {
            trialEndsAt: trialEndsAt ? new Date(trialEndsAt) : null,
          }),
          ...(nextRenewalAt !== undefined && {
            nextRenewalAt: nextRenewalAt ? new Date(nextRenewalAt) : null,
          }),
          ...(typeof reminderDaysBefore === "number" &&
            reminderDaysBefore >= 0 &&
            reminderDaysBefore <= 90 && { reminderDaysBefore: Math.floor(reminderDaysBefore) }),
          ...(foreignCurrency !== undefined && {
            foreignCurrency: typeof foreignCurrency === "string" && foreignCurrency ? foreignCurrency.toUpperCase() : null,
          }),
          ...(foreignAmount !== undefined && {
            foreignAmount: typeof foreignAmount === "number" ? foreignAmount : null,
          }),
        },
        include: {
          recurringExpense: {
            include: {
              account: { select: { id: true, name: true, bankName: true } },
            },
          },
        },
      })
    })

    return NextResponse.json({ subscription: updated })
  } catch (error) {
    const dbErr = getDbErrorResponse(error)
    if (dbErr) return NextResponse.json(dbErr.body, { status: dbErr.status })
    console.error("Error updating subscription:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const existing = await prismaSubscription.findFirst({
      where: { id, userId: session.user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
    }

    await prismaSubscription.delete({ where: { id } })
    return NextResponse.json({ message: "Removed from subscriptions" })
  } catch (error) {
    const dbErr = getDbErrorResponse(error)
    if (dbErr) return NextResponse.json(dbErr.body, { status: dbErr.status })
    console.error("Error deleting subscription:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
