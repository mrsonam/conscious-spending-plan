import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { coerceMinor, subtractMinor } from "@/lib/money"

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

    const hadAllocation =
      !entry.excludeFromAllocation &&
      (entry.allocationFixedCosts != null ||
        entry.allocationSavings != null ||
        entry.allocationInvestment != null ||
        entry.allocationGuiltFreeSpending != null)

    const incomeDate = entry.date
    const targetMonth = incomeDate.getMonth() + 1
    const targetYear = incomeDate.getFullYear()
    const entryAmount = coerceMinor(entry.amount)

    await prisma.$transaction(
      async (tx) => {
        if (hadAllocation) {
          const categories = [
            { key: "fixedCosts" as const, amount: entry.allocationFixedCosts ?? 0n },
            { key: "savings" as const, amount: entry.allocationSavings ?? 0n },
            { key: "investment" as const, amount: entry.allocationInvestment ?? 0n },
            { key: "guiltFreeSpending" as const, amount: entry.allocationGuiltFreeSpending ?? 0n },
          ]
          for (const { key, amount } of categories) {
            const allocMinor = coerceMinor(amount)
            if (allocMinor <= 0n) continue
            const row = await tx.categoryBalance.findFirst({
              where: {
                userId: session.user.id,
                category: key,
                month: targetMonth,
                year: targetYear,
              },
            })
            if (row) {
              const current = coerceMinor(row.balance ?? 0n)
              const newBalance = subtractMinor(current, allocMinor)
              await tx.categoryBalance.update({
                where: { id: row.id },
                data: { balance: newBalance < 0n ? 0n : newBalance },
              })
            }
          }
        }

        if (entry.accountId && entryAmount > 0n) {
          const account = await tx.account.findFirst({
            where: { id: entry.accountId, userId: session.user.id },
          })
          if (account) {
            await tx.account.update({
              where: { id: account.id },
              data: { balance: { decrement: entryAmount } },
            })
          }
        }

        await tx.incomeEntry.delete({
          where: { id },
        })
      },
      { timeout: 15000 }
    )

    return NextResponse.json({ message: "Income entry deleted" })
  } catch (error) {
    console.error("Error deleting income entry:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
