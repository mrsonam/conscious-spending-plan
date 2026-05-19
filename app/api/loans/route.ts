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

    const loans = await prisma.loan.findMany({
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
        loans: mapMoneyListToApi(
          loans as Record<string, unknown>[],
          currency,
          LOAN_MONEY_FIELDS
        ),
      },
      currency
    )
  } catch (error) {
    console.error("Error fetching loans:", error)
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
    const { accountId, amount, description, borrowerName, date, dueDate } =
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

    if (account.balance < amountMinor) {
      return NextResponse.json(
        { error: "Insufficient funds in the account" },
        { status: 400 }
      )
    }

    const loan = await prisma.$transaction(async (tx) => {
      const createdLoan = await tx.loan.create({
        data: {
          userId: session.user.id,
          accountId,
          amount: amountMinor,
          description: description || null,
          borrowerName: borrowerName || null,
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
        data: { balance: { decrement: amountMinor } },
      })

      return createdLoan
    })

    return moneyJsonResponse(
      {
        loan: mapMoneyFieldsToApi(
          loan as unknown as Record<string, unknown>,
          currency,
          LOAN_MONEY_FIELDS
        ),
      },
      currency,
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating loan:", error)
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
    const { loanId, toAccountId } = (await request.json()) as {
      loanId?: string
      toAccountId?: string
    }

    if (!loanId) {
      return NextResponse.json(
        { error: "Loan ID is required" },
        { status: 400 }
      )
    }

    const loan = await prisma.loan.findFirst({
      where: { id: loanId, userId: session.user.id },
    })

    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 })
    }

    if (loan.status === "repaid") {
      return NextResponse.json(
        { error: "Loan is already marked as repaid" },
        { status: 400 }
      )
    }

    const outstanding = subtractMinor(loan.amount, loan.repaidAmount)

    if (outstanding <= 0n) {
      return NextResponse.json(
        { error: "No outstanding amount to repay" },
        { status: 400 }
      )
    }

    let creditAccountId = loan.accountId
    if (typeof toAccountId === "string" && toAccountId.trim().length > 0) {
      const destination = await prisma.account.findFirst({
        where: { id: toAccountId.trim(), userId: session.user.id },
      })
      if (!destination) {
        return NextResponse.json(
          { error: "Destination account not found or does not belong to user" },
          { status: 404 }
        )
      }
      creditAccountId = destination.id
    }

    const updatedLoan = await prisma.$transaction(async (tx) => {
      const loanUpdate = await tx.loan.update({
        where: { id: loan.id },
        data: {
          repaidAmount: loan.amount,
          status: "repaid",
        },
        include: {
          account: {
            select: { id: true, name: true, bankName: true },
          },
        },
      })

      await tx.account.update({
        where: { id: creditAccountId },
        data: { balance: { increment: outstanding } },
      })

      return loanUpdate
    })

    return moneyJsonResponse(
      {
        loan: mapMoneyFieldsToApi(
          updatedLoan as unknown as Record<string, unknown>,
          currency,
          LOAN_MONEY_FIELDS
        ),
      },
      currency
    )
  } catch (error) {
    console.error("Error updating loan:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
