import { NextResponse } from "next/server"
import { authFromRequest } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { computeHoldingAmountMinor } from "@/lib/investment-money"
import { getUserDisplayCurrency } from "@/lib/user-currency"
import { serializeMoneyForApi } from "@/lib/money-api"
import { sharesToApiString } from "@/lib/shares"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authed = await authFromRequest(request)
    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = await getUserDisplayCurrency(authed.userId)
    const { id } = await params

    const existing = await prisma.investmentHolding.findFirst({
      where: { id, userId: authed.userId },
    })
    if (!existing) {
      return NextResponse.json(
        { error: "Investment holding not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { pricePerUnit, numberOfShares, brokerageFee, date } = body

    let computed
    try {
      computed = computeHoldingAmountMinor(
        { numberOfShares, pricePerUnit, brokerageFee },
        currency
      )
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Invalid investment data"
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const balanceDelta = existing.amount - computed.amountMinor

    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.account.findFirst({
        where: {
          id: existing.accountId,
          userId: authed.userId,
          accountType: "investment",
        },
      })
      if (!account) {
        throw new Error("Investment account not found")
      }

      if (balanceDelta < 0n) {
        // Atomic check-and-decrement so concurrent edits can't overdraw.
        const updated = await tx.account.updateMany({
          where: { id: account.id, balance: { gte: -balanceDelta } },
          data: { balance: { decrement: -balanceDelta } },
        })
        if (updated.count === 0) {
          throw new Error(
            "Insufficient funds in investment account for this change."
          )
        }
      } else if (balanceDelta > 0n) {
        await tx.account.update({
          where: { id: account.id },
          data: { balance: { increment: balanceDelta } },
        })
      }

      const holding = await tx.investmentHolding.update({
        where: { id },
        data: {
          amount: computed.amountMinor,
          pricePerUnit: computed.pricePerUnitMinor,
          numberOfShares: computed.numberOfShares,
          brokerageFee: computed.brokerageFeeMinor,
          ...(date != null && { date: new Date(date) }),
        },
      })

      return { account, holding }
    })

    return NextResponse.json({
      holding: {
        ...result.holding,
        amount: serializeMoneyForApi(result.holding.amount, currency),
        pricePerUnit:
          result.holding.pricePerUnit != null
            ? serializeMoneyForApi(result.holding.pricePerUnit, currency)
            : null,
        brokerageFee:
          result.holding.brokerageFee != null
            ? serializeMoneyForApi(result.holding.brokerageFee, currency)
            : null,
        numberOfShares: sharesToApiString(result.holding.numberOfShares),
      },
    })
  } catch (error) {
    console.error("Error updating investment holding:", error)
    const message =
      error instanceof Error ? error.message : "Internal server error"
    // Only expose known, user-facing messages; anything else stays generic.
    if (message === "Investment account not found") {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    if (message.startsWith("Insufficient funds")) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authed = await authFromRequest(request)
    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const existing = await prisma.investmentHolding.findFirst({
      where: { id, userId: authed.userId },
    })
    if (!existing) {
      return NextResponse.json(
        { error: "Investment holding not found" },
        { status: 404 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: existing.accountId },
        data: { balance: { increment: existing.amount } },
      })

      await tx.investmentHolding.delete({ where: { id } })
    })

    return NextResponse.json({ message: "Investment holding deleted" })
  } catch (error) {
    console.error("Error deleting investment holding:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
