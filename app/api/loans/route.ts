import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Get loans for the current user, optionally filtered by status
export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    const where: any = {
      userId: session.user.id,
    }

    if (status) {
      where.status = status
    }

    const loans = await prisma.loan.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            bankName: true,
          },
        },
      },
      take: 100,
    })

    return NextResponse.json({ loans })
  } catch (error) {
    console.error("Error fetching loans:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Create a new loan (money you lent out)
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { accountId, amount, description, borrowerName, date, dueDate } =
      await request.json()

    if (!accountId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Account ID and a positive amount are required" },
        { status: 400 }
      )
    }

    // Verify account belongs to user
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId: session.user.id,
      },
    })

    if (!account) {
      return NextResponse.json(
        { error: "Account not found or does not belong to user" },
        { status: 404 }
      )
    }

    // Check if account has sufficient balance
    if (account.balance < amount) {
      return NextResponse.json(
        { error: "Insufficient funds in the account" },
        { status: 400 }
      )
    }

    // Create loan and update account balance in a transaction
    const loan = await prisma.$transaction(async (tx) => {
      const createdLoan = await tx.loan.create({
        data: {
          userId: session.user.id,
          accountId,
          amount,
          description: description || null,
          borrowerName: borrowerName || null,
          date: date ? new Date(date) : new Date(),
          dueDate: dueDate ? new Date(dueDate) : null,
        },
        include: {
          account: {
            select: {
              id: true,
              name: true,
              bankName: true,
            },
          },
        },
      })

      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: { decrement: amount },
        },
      })

      return createdLoan
    })

    return NextResponse.json({ loan }, { status: 201 })
  } catch (error) {
    console.error("Error creating loan:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Mark a loan as repaid and restore money to the account.
// This does NOT count as new income for fund allocation.
export async function PATCH(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { loanId } = await request.json()

    if (!loanId) {
      return NextResponse.json(
        { error: "Loan ID is required" },
        { status: 400 }
      )
    }

    const loan = await prisma.loan.findFirst({
      where: {
        id: loanId,
        userId: session.user.id,
      },
    })

    if (!loan) {
      return NextResponse.json(
        { error: "Loan not found" },
        { status: 404 }
      )
    }

    if (loan.status === "repaid") {
      return NextResponse.json(
        { error: "Loan is already marked as repaid" },
        { status: 400 }
      )
    }

    const outstanding = loan.amount - loan.repaidAmount

    if (outstanding <= 0) {
      return NextResponse.json(
        { error: "No outstanding amount to repay" },
        { status: 400 }
      )
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
            select: {
              id: true,
              name: true,
              bankName: true,
            },
          },
        },
      })

      await tx.account.update({
        where: { id: loan.accountId },
        data: {
          balance: { increment: outstanding },
        },
      })

      return loanUpdate
    })

    return NextResponse.json({ loan: updatedLoan })
  } catch (error) {
    console.error("Error updating loan:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

