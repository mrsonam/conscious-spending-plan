import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params

    const entry = await prisma.incomeEntry.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!entry) {
      return NextResponse.json(
        { error: "Income entry not found" },
        { status: 404 }
      )
    }

    await prisma.$transaction(async (tx) => {
      // Deduct the income amount from the account it was deposited into
      if (entry.accountId && entry.amount > 0) {
        const account = await tx.account.findFirst({
          where: { id: entry.accountId, userId: session.user.id },
        })
        if (account) {
          await tx.account.update({
            where: { id: account.id },
            data: {
              balance: { decrement: entry.amount },
            },
          })
        }
      }
      await tx.incomeEntry.delete({
        where: { id },
      })
    })

    return NextResponse.json({ message: "Income entry deleted" })
  } catch (error) {
    console.error("Error deleting income entry:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
