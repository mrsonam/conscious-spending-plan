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
import { PRE_TRACKING_SAVINGS_ACCOUNT_TYPES } from "@/lib/pre-tracking-savings"

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

    const loanDate = date ? new Date(date) : new Date()

    const loan = await prisma.$transaction(async (tx) => {
      // Atomic check-and-decrement: WHERE balance >= amount prevents overdraft
      // under concurrent requests (the pre-check above is only a fast path).
      const updated = await tx.account.updateMany({
        where: { id: accountId, balance: { gte: amountMinor } },
        data: { balance: { decrement: amountMinor } },
      })
      if (updated.count === 0) throw new Error("INSUFFICIENT_FUNDS")

      // Debit the savings pillar for the outstanding principal — the cash has
      // left the account, so budget pillars must stop counting it as available.
      // Skipped for non-liquid accounts (e.g. investment), whose funds were
      // never reflected in a pillar to begin with. Reversed by deleting this
      // expense when the loan is repaid.
      const isLiquidAccount = (PRE_TRACKING_SAVINGS_ACCOUNT_TYPES as readonly string[]).includes(
        account.accountType,
      )
      const pillarExpense = isLiquidAccount
        ? await tx.expense.create({
            data: {
              userId: session.user.id,
              accountId,
              amount: amountMinor,
              description: `Loan to ${borrowerName || "borrower"}`,
              category: "savings",
              expenseCategory: "loan",
              date: loanDate,
              source: "loan",
            },
          })
        : null

      return tx.loan.create({
        data: {
          userId: session.user.id,
          accountId,
          amount: amountMinor,
          description: description || null,
          borrowerName: borrowerName || null,
          date: loanDate,
          dueDate: dueDate ? new Date(dueDate) : null,
          expenseId: pillarExpense?.id,
        },
        include: {
          account: {
            select: { id: true, name: true, bankName: true },
          },
        },
      })
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
    if (error instanceof Error && error.message === "INSUFFICIENT_FUNDS") {
      return NextResponse.json({ error: "Insufficient funds in the account" }, { status: 400 })
    }
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
      // Atomic status flip: a concurrent repayment of the same loan matches
      // zero rows here, so the account can't be credited twice.
      const flipped = await tx.loan.updateMany({
        where: { id: loan.id, status: { not: "repaid" } },
        data: {
          repaidAmount: loan.amount,
          status: "repaid",
        },
      })
      if (flipped.count === 0) throw new Error("ALREADY_REPAID")

      await tx.account.update({
        where: { id: creditAccountId },
        data: { balance: { increment: outstanding } },
      })

      // Cash is back, so the pillar debit no longer applies.
      if (loan.expenseId) {
        await tx.expense.delete({ where: { id: loan.expenseId } })
      }

      return tx.loan.findUniqueOrThrow({
        where: { id: loan.id },
        include: {
          account: {
            select: { id: true, name: true, bankName: true },
          },
        },
      })
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
    if (error instanceof Error && error.message === "ALREADY_REPAID") {
      return NextResponse.json(
        { error: "Loan is already marked as repaid" },
        { status: 400 }
      )
    }
    console.error("Error updating loan:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
