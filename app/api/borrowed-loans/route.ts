import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Get borrowed loans (money the user borrowed from others)
export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
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

    const borrowedLoans = await (prisma as any).borrowedLoan.findMany({
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

    return NextResponse.json({ borrowedLoans })
  } catch (error) {
    console.error("Error fetching borrowed loans:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

// Create a new borrowed loan (money the user borrowed from someone else)
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      )
    }

    const { accountId, amount, description, lenderName, date, dueDate } =
      await request.json()

    if (!accountId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Account ID and a positive amount are required" },
        { status: 400 },
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
        { status: 404 },
      )
    }

    // Create borrowed loan and update account balance in a transaction
    const borrowedLoan = await prisma.$transaction(async (tx) => {
      const created = await (tx as any).borrowedLoan.create({
        data: {
          userId: session.user.id,
          accountId,
          amount,
          description: description || null,
          lenderName: lenderName || null,
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
          // Borrowing money increases the account balance
          balance: { increment: amount },
        },
      })

      return created
    })

    return NextResponse.json({ borrowedLoan }, { status: 201 })
  } catch (error) {
    console.error("Error creating borrowed loan:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

// Mark a borrowed loan as repaid and reduce money from the account.
// This does NOT count as an expense category; it's just debt repayment.
export async function PATCH(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      )
    }

    const { borrowedLoanId, fromAccountId } = await request.json() as {
      borrowedLoanId?: string
      fromAccountId?: string
    }

    if (!borrowedLoanId) {
      return NextResponse.json(
        { error: "Borrowed loan ID is required" },
        { status: 400 },
      )
    }

    const borrowedLoan = await (prisma as any).borrowedLoan.findFirst({
      where: {
        id: borrowedLoanId,
        userId: session.user.id,
      },
    })

    if (!borrowedLoan) {
      return NextResponse.json(
        { error: "Borrowed loan not found" },
        { status: 404 },
      )
    }

    if (borrowedLoan.status === "repaid") {
      return NextResponse.json(
        { error: "Borrowed loan is already marked as repaid" },
        { status: 400 },
      )
    }

    const outstanding = borrowedLoan.amount - borrowedLoan.repaidAmount

    if (outstanding <= 0) {
      return NextResponse.json(
        { error: "No outstanding amount to repay" },
        { status: 400 },
      )
    }

    let debitAccountId = borrowedLoan.accountId as string
    if (typeof fromAccountId === "string" && fromAccountId.trim().length > 0) {
      const payer = await prisma.account.findFirst({
        where: {
          id: fromAccountId.trim(),
          userId: session.user.id,
        },
      })
      if (!payer) {
        return NextResponse.json(
          { error: "Account not found or does not belong to user" },
          { status: 404 },
        )
      }
      debitAccountId = payer.id
    }

    const updatedBorrowedLoan = await prisma.$transaction(async (tx) => {
      const loanUpdate = await (tx as any).borrowedLoan.update({
        where: { id: borrowedLoan.id },
        data: {
          repaidAmount: borrowedLoan.amount,
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
        where: { id: debitAccountId },
        data: {
          // Repaying reduces the account balance
          balance: { decrement: outstanding },
        },
      })

      return loanUpdate
    })

    return NextResponse.json({ borrowedLoan: updatedBorrowedLoan })
  } catch (error) {
    console.error("Error updating borrowed loan:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

