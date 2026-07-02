import { NextResponse } from "next/server"
import { moneyJsonResponse } from "@/lib/api-money-response"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { parseMoneyFromApi } from "@/lib/money-api"
import {
  LOAN_MONEY_FIELDS,
  mapMoneyFieldsToApi,
  mapMoneyListToApi,
} from "@/lib/money-serialize"
import { currencyFromSession, getUserDisplayCurrency } from "@/lib/user-currency"
import { subtractMinor } from "@/lib/money"

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = currencyFromSession(session.user.displayCurrency)
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    const where: { userId: string; status?: string } = {
      userId: session.user.id,
    }
    if (status) where.status = status

    const borrowedLoans = await prisma.borrowedLoan.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        account: {
          select: { id: true, name: true, bankName: true },
        },
      },
      take: 100,
    })

    return moneyJsonResponse(
      {
        borrowedLoans: mapMoneyListToApi(
          borrowedLoans as Record<string, unknown>[],
          currency,
          LOAN_MONEY_FIELDS
        ),
      },
      currency
    )
  } catch (error) {
    console.error("Error fetching borrowed loans:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = await getUserDisplayCurrency(session.user.id)
    const { accountId, amount, description, lenderName, date, dueDate } =
      await request.json()

    let amountMinor: bigint
    try {
      amountMinor = parseMoneyFromApi(amount, currency)
    } catch {
      return NextResponse.json(
        { error: "Account ID and a positive amount are required" },
        { status: 400 }
      )
    }
    if (!accountId || amountMinor <= 0n) {
      return NextResponse.json(
        { error: "Account ID and a positive amount are required" },
        { status: 400 }
      )
    }

    const account = await prisma.account.findFirst({
      where: { id: accountId, userId: session.user.id },
    })

    if (!account) {
      return NextResponse.json(
        { error: "Account not found or does not belong to user" },
        { status: 404 }
      )
    }

    const borrowedLoan = await prisma.$transaction(async (tx) => {
      const created = await tx.borrowedLoan.create({
        data: {
          userId: session.user.id,
          accountId,
          amount: amountMinor,
          description: description || null,
          lenderName: lenderName || null,
          date: date ? new Date(date) : new Date(),
          dueDate: dueDate ? new Date(dueDate) : null,
        },
        include: {
          account: {
            select: { id: true, name: true, bankName: true },
          },
        },
      })

      await tx.account.update({
        where: { id: accountId },
        data: { balance: { increment: amountMinor } },
      })

      return created
    })

    return moneyJsonResponse(
      {
        borrowedLoan: mapMoneyFieldsToApi(
          borrowedLoan as unknown as Record<string, unknown>,
          currency,
          LOAN_MONEY_FIELDS
        ),
      },
      currency,
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating borrowed loan:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = await getUserDisplayCurrency(session.user.id)
    const { borrowedLoanId, fromAccountId } = (await request.json()) as {
      borrowedLoanId?: string
      fromAccountId?: string
    }

    if (!borrowedLoanId) {
      return NextResponse.json(
        { error: "Borrowed loan ID is required" },
        { status: 400 }
      )
    }

    const borrowedLoan = await prisma.borrowedLoan.findFirst({
      where: { id: borrowedLoanId, userId: session.user.id },
    })

    if (!borrowedLoan) {
      return NextResponse.json(
        { error: "Borrowed loan not found" },
        { status: 404 }
      )
    }

    if (borrowedLoan.status === "repaid") {
      return NextResponse.json(
        { error: "Borrowed loan is already marked as repaid" },
        { status: 400 }
      )
    }

    const outstanding = subtractMinor(
      borrowedLoan.amount,
      borrowedLoan.repaidAmount
    )

    if (outstanding <= 0n) {
      return NextResponse.json(
        { error: "No outstanding amount to repay" },
        { status: 400 }
      )
    }

    let debitAccountId = borrowedLoan.accountId
    if (typeof fromAccountId === "string" && fromAccountId.trim().length > 0) {
      const payer = await prisma.account.findFirst({
        where: { id: fromAccountId.trim(), userId: session.user.id },
      })
      if (!payer) {
        return NextResponse.json(
          { error: "Account not found or does not belong to user" },
          { status: 404 }
        )
      }
      debitAccountId = payer.id
    }

    const updatedBorrowedLoan = await prisma.$transaction(async (tx) => {
      // Atomic status flip: a concurrent repayment of the same loan matches
      // zero rows here, so the account can't be debited twice.
      const flipped = await tx.borrowedLoan.updateMany({
        where: { id: borrowedLoan.id, status: { not: "repaid" } },
        data: {
          repaidAmount: borrowedLoan.amount,
          status: "repaid",
        },
      })
      if (flipped.count === 0) throw new Error("ALREADY_REPAID")

      // Atomic check-and-decrement so the repayment can't overdraw the account.
      const debited = await tx.account.updateMany({
        where: { id: debitAccountId, balance: { gte: outstanding } },
        data: { balance: { decrement: outstanding } },
      })
      if (debited.count === 0) throw new Error("INSUFFICIENT_FUNDS")

      return tx.borrowedLoan.findUniqueOrThrow({
        where: { id: borrowedLoan.id },
        include: {
          account: {
            select: { id: true, name: true, bankName: true },
          },
        },
      })
    })

    return moneyJsonResponse(
      {
        borrowedLoan: mapMoneyFieldsToApi(
          updatedBorrowedLoan as unknown as Record<string, unknown>,
          currency,
          LOAN_MONEY_FIELDS
        ),
      },
      currency
    )
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_REPAID") {
      return NextResponse.json(
        { error: "Borrowed loan is already marked as repaid" },
        { status: 400 }
      )
    }
    if (error instanceof Error && error.message === "INSUFFICIENT_FUNDS") {
      return NextResponse.json(
        { error: "Insufficient funds in the account to repay this loan" },
        { status: 400 }
      )
    }
    console.error("Error updating borrowed loan:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
