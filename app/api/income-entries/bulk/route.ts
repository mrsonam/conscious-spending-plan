import { NextResponse } from "next/server"
import { moneyJsonResponse } from "@/lib/api-money-response"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getDbErrorResponse } from "@/lib/db-error"
import { logIncomeEntryForUser } from "@/lib/log-income-entry-server"
import { serializeMoneyForApi } from "@/lib/money-api"
import { mapIncomeEntryListToApi } from "@/lib/money-serialize"
import { currencyFromSession } from "@/lib/user-currency"
import { addMinor, coerceMinor } from "@/lib/money"
import { schedulePersistPreviousMonthClosing } from "@/lib/monthly-tracking"
import { reallocateMonthIncomeForUser } from "@/lib/reallocate-month-income"
import { applySavingGoalCreditsForIncome } from "@/lib/saving-goal-credits-server"

type BulkIncomeRow = {
  amount: unknown
  description?: string | null
  date?: string
  allocateToBudget?: boolean
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = currencyFromSession(session.user.displayCurrency)
    const body = await request.json()
    const { accountId: bodyAccountId, entries: rawEntries } = body as {
      accountId?: string
      entries: BulkIncomeRow[]
    }

    if (!Array.isArray(rawEntries) || rawEntries.length === 0) {
      return NextResponse.json(
        { error: "entries array is required and must not be empty" },
        { status: 400 },
      )
    }
    if (rawEntries.length > 500) {
      return NextResponse.json(
        { error: "At most 500 entries can be imported at once" },
        { status: 400 },
      )
    }

    const accountId = bodyAccountId
    if (accountId) {
      const account = await prisma.account.findFirst({
        where: { id: accountId, userId: session.user.id },
      })
      if (!account) {
        return NextResponse.json(
          { error: "Account not found or does not belong to user" },
          { status: 404 },
        )
      }
    }

    const sorted = [...rawEntries].sort((a, b) => {
      const da = a.date ?? ""
      const db = b.date ?? ""
      return da.localeCompare(db)
    })

    const createdIds: string[] = []
    const monthsToSync = new Set<string>()
    let totalMinor = 0n

    for (const row of sorted) {
      const allocateToBudget = row.allocateToBudget !== false
      const result = await logIncomeEntryForUser(session.user.id, currency, {
        amount: row.amount,
        description: row.description ?? null,
        date: row.date,
        accountId: accountId ?? null,
        allocateToBudget,
        deferEnvelopeSync: true,
      })
      createdIds.push(result.entryId)
      totalMinor = addMinor(totalMinor, result.incomeMinor)

      if (row.date && /^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
        const d = new Date(row.date + "T12:00:00")
        monthsToSync.add(`${d.getFullYear()}-${d.getMonth() + 1}`)
      } else {
        const now = new Date()
        monthsToSync.add(`${now.getFullYear()}-${now.getMonth() + 1}`)
      }
    }

    for (const key of [...monthsToSync].sort()) {
      const [yearStr, monthStr] = key.split("-")
      await reallocateMonthIncomeForUser(
        session.user.id,
        currency,
        Number(monthStr),
        Number(yearStr),
      )
    }

    for (const entryId of createdIds) {
      const entry = await prisma.incomeEntry.findUnique({
        where: { id: entryId },
        select: { allocationSavings: true },
      })
      const savingsMinor = coerceMinor(entry?.allocationSavings ?? 0n)
      if (savingsMinor > 0n) {
        await applySavingGoalCreditsForIncome(prisma, {
          userId: session.user.id,
          incomeEntryId: entryId,
          savingsAllocationMinor: savingsMinor,
        })
      }
    }

    schedulePersistPreviousMonthClosing(session.user.id)

    const created = await prisma.incomeEntry.findMany({
      where: { id: { in: createdIds }, userId: session.user.id },
      include: { account: true },
      orderBy: { date: "desc" },
    })

    return moneyJsonResponse(
      {
        created: created.length,
        total: serializeMoneyForApi(totalMinor, currency),
        entries: mapIncomeEntryListToApi(
          created as unknown as Record<string, unknown>[],
          currency,
        ),
      },
      currency,
      { status: 201 },
    )
  } catch (error) {
    const dbErr = getDbErrorResponse(error)
    if (dbErr) return NextResponse.json(dbErr.body, { status: dbErr.status })
    const message =
      error instanceof Error ? error.message : "Internal server error"
    if (message === "Fund allocation not found") {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    if (message === "Valid income amount is required") {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    console.error("Bulk income error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
