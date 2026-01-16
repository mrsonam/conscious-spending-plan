import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { fromAccountId, toAccountId, amount, description, date, category } = await request.json()

    if (!fromAccountId || !toAccountId || !amount) {
      return NextResponse.json(
        { error: "From account, to account, and amount are required" },
        { status: 400 }
      )
    }

    if (fromAccountId === toAccountId) {
      return NextResponse.json(
        { error: "Cannot transfer to the same account" },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      )
    }

    // Verify both accounts belong to user
    const [fromAccount, toAccount] = await Promise.all([
      prisma.account.findFirst({
        where: { id: fromAccountId, userId: session.user.id },
      }),
      prisma.account.findFirst({
        where: { id: toAccountId, userId: session.user.id },
      }),
    ])

    if (!fromAccount || !toAccount) {
      return NextResponse.json(
        { error: "One or both accounts not found" },
        { status: 404 }
      )
    }

    if (fromAccount.balance < amount) {
      return NextResponse.json(
        { error: "Insufficient funds" },
        { status: 400 }
      )
    }

    // Perform transfer in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update balances
      await tx.account.update({
        where: { id: fromAccountId },
        data: { balance: { decrement: amount } },
      })

      await tx.account.update({
        where: { id: toAccountId },
        data: { balance: { increment: amount } },
      })

      // Create transfer record
      const transfer = await tx.transfer.create({
        data: {
          userId: session.user.id,
          fromAccountId,
          toAccountId,
          amount,
          description: description || null,
          category: category || null, // Fund category if provided
          date: date ? new Date(date) : new Date(), // Use provided date or current date
        },
        include: {
          fromAccount: true,
          toAccount: true,
        },
      })

      return transfer
    })

    return NextResponse.json({ transfer: result }, { status: 201 })
  } catch (error) {
    console.error("Error creating transfer:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

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
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const where: any = {
      userId: session.user.id,
    }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) {
        where.date.gte = new Date(startDate)
      }
      if (endDate) {
        where.date.lte = new Date(endDate)
      }
    }

    const transfers = await prisma.transfer.findMany({
      where,
      include: {
        fromAccount: true,
        toAccount: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    })

    return NextResponse.json({ transfers })
  } catch (error) {
    console.error("Error fetching transfers:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
