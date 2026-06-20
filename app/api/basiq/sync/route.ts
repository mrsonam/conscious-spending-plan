import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { currencyFromSession } from "@/lib/user-currency"
import { getBasiqTransactions } from "@/lib/basiq-client"
import { syncTransactions } from "@/lib/basiq-transaction-sync"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = currencyFromSession(session.user.displayCurrency)
    const body = await request.json().catch(() => ({}))
    const accountId = (body as { accountId?: string }).accountId

    const connection = await prisma.basiqConnection.findFirst({
      where: { userId: session.user.id, status: "active" },
    })
    if (!connection) {
      return NextResponse.json({ error: "No bank connected" }, { status: 400 })
    }

    const linkedAccounts = await prisma.account.findMany({
      where: {
        userId: session.user.id,
        basiqAccountId: { not: null },
        ...(accountId ? { id: accountId } : {}),
      },
    })

    if (linkedAccounts.length === 0) {
      return NextResponse.json({ error: "No linked accounts" }, { status: 400 })
    }

    let totalCreated = 0
    let totalSkipped = 0
    let totalErrors = 0

    for (const acc of linkedAccounts) {
      if (!acc.basiqAccountId) continue
      const transactions = await getBasiqTransactions(
        connection.basiqUserId,
        acc.basiqAccountId,
        acc.lastSyncedAt ?? undefined
      )
      const result = await syncTransactions(session.user.id, currency, transactions)
      totalCreated += result.created
      totalSkipped += result.skipped
      totalErrors += result.errors
    }

    return NextResponse.json({
      created: totalCreated,
      skipped: totalSkipped,
      errors: totalErrors,
    })
  } catch (error) {
    console.error("Basiq sync error:", error)
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    )
  }
}
