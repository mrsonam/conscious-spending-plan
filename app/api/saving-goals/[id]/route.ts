import { NextResponse } from "next/server"
import { moneyJsonResponse } from "@/lib/api-money-response"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { mapSavingGoalToApi } from "@/lib/saving-goal-api-map"
import {
  displayPercentToBps,
  parseOptionalTargetMinor,
  validateActiveGoalPercentSum,
} from "@/lib/saving-goal-allocation"
import { parseMoneyFromApi } from "@/lib/money-api"
import { transferToSavingGoal } from "@/lib/saving-goal-general-savings"
import { currencyFromSession } from "@/lib/user-currency"
import {
  computeRunningBalancesMinor,
  summarizeSavingGoalLedgerMinor,
  type SavingGoalLedgerEntryLike,
} from "@/lib/saving-goal-ledger"
import { mapSavingGoalLedgerEntryToApi } from "@/lib/saving-goal-api-map"
import { loadSavingGoalProjections } from "@/lib/saving-goal-projection"
import { serializeMoneyForApi } from "@/lib/money-api"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const currency = currencyFromSession(session.user.displayCurrency)

    const goal = await prisma.savingGoal.findFirst({
      where: { id, userId: session.user.id },
    })
    if (!goal) {
      return NextResponse.json({ error: "Saving goal not found" }, { status: 404 })
    }

    const entriesAsc = await prisma.savingGoalLedgerEntry.findMany({
      where: { savingGoalId: id, userId: session.user.id },
      orderBy: { createdAt: "asc" },
      include: { expense: { select: { description: true } } },
    })
    // Prisma types `source` as plain `string`; narrow it to the ledger union
    // the pure functions expect (the column only ever holds these 5 values).
    const typedEntries = entriesAsc.map((e) => ({
      ...(e as unknown as SavingGoalLedgerEntryLike),
      expenseDescription: e.expense?.description ?? null,
    }))

    const withBalances = computeRunningBalancesMinor(typedEntries)
    const summary = summarizeSavingGoalLedgerMinor(typedEntries)
    const projections = await loadSavingGoalProjections(session.user.id, [goal], currency)

    return moneyJsonResponse(
      {
        goal: mapSavingGoalToApi(goal as unknown as Record<string, unknown>, currency),
        projection: projections[goal.id] ?? null,
        stats: {
          totalContributed: serializeMoneyForApi(summary.totalContributedMinor, currency),
          fromPaychecks: serializeMoneyForApi(summary.fromPaychecksMinor, currency),
          fromManualTransfers: serializeMoneyForApi(summary.fromManualTransfersMinor, currency),
          withdrawn: serializeMoneyForApi(summary.withdrawnMinor, currency),
        },
        ledger: [...withBalances]
          .reverse()
          .map((e) => mapSavingGoalLedgerEntryToApi(e, currency)),
      },
      currency
    )
  } catch (error) {
    console.error("Error fetching saving goal:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const currency = currencyFromSession(session.user.displayCurrency)
    const body = (await request.json()) as {
      name?: string
      target?: number | string | null
      percent?: number | string
      action?: "archive" | "withdraw" | "transfer"
      amount?: number | string
    }

    const goal = await prisma.savingGoal.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!goal) {
      return NextResponse.json({ error: "Saving goal not found" }, { status: 404 })
    }

    if (body.action === "archive") {
      const updated = await prisma.$transaction(async (tx) => {
        const fresh = await tx.savingGoal.findFirst({
          where: { id, userId: session.user.id },
        })
        if (!fresh) {
          throw new Error("Saving goal not found")
        }
        if (fresh.currentMinor > 0n) {
          await tx.savingGoalLedgerEntry.create({
            data: {
              userId: session.user.id,
              savingGoalId: id,
              source: "archive_reset",
              amountMinor: -fresh.currentMinor,
            },
          })
        }
        return tx.savingGoal.update({
          where: { id },
          data: { status: "archived", currentMinor: 0n },
        })
      })
      return moneyJsonResponse(
        { goal: mapSavingGoalToApi(updated as unknown as Record<string, unknown>, currency) },
        currency
      )
    }

    if (body.action === "transfer") {
      if (body.amount == null) {
        return NextResponse.json({ error: "Amount is required" }, { status: 400 })
      }

      let amountMinor: bigint
      try {
        amountMinor = parseMoneyFromApi(body.amount, currency)
      } catch {
        return NextResponse.json(
          { error: "Enter a valid transfer amount" },
          { status: 400 }
        )
      }

      const result = await prisma.$transaction((tx) =>
        transferToSavingGoal(tx, {
          userId: session.user.id,
          goalId: id,
          amountMinor,
        })
      )

      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }

      return moneyJsonResponse(
        {
          goal: mapSavingGoalToApi(
            result.goal as unknown as Record<string, unknown>,
            currency
          ),
        },
        currency
      )
    }

    if (body.action === "withdraw") {
      if (goal.status !== "complete") {
        return NextResponse.json(
          { error: "Only completed goals can be withdrawn" },
          { status: 400 }
        )
      }
      const updated = await prisma.$transaction(async (tx) => {
        const fresh = await tx.savingGoal.findFirst({
          where: { id, userId: session.user.id },
        })
        if (!fresh) {
          throw new Error("Saving goal not found")
        }
        if (fresh.currentMinor > 0n) {
          await tx.savingGoalLedgerEntry.create({
            data: {
              userId: session.user.id,
              savingGoalId: id,
              source: "withdrawal",
              amountMinor: -fresh.currentMinor,
            },
          })
        }
        return tx.savingGoal.update({
          where: { id },
          data: { currentMinor: 0n, status: "archived" },
        })
      })
      return moneyJsonResponse(
        { goal: mapSavingGoalToApi(updated as unknown as Record<string, unknown>, currency) },
        currency
      )
    }

    if (goal.status === "complete" || goal.status === "archived") {
      return NextResponse.json(
        { error: "Completed or archived goals cannot be edited" },
        { status: 400 }
      )
    }

    const data: {
      name?: string
      targetMinor?: bigint | null
      percentBps?: number
    } = {}

    if (body.name !== undefined) {
      const name = body.name.trim()
      if (!name) {
        return NextResponse.json({ error: "Name is required" }, { status: 400 })
      }
      data.name = name
    }

    if (body.target !== undefined) {
      const targetParsed = parseOptionalTargetMinor(body.target, currency)
      if (!targetParsed.ok) {
        return NextResponse.json({ error: targetParsed.error }, { status: 400 })
      }
      data.targetMinor = targetParsed.value
    }

    if (body.percent !== undefined) {
      const percentNum = Number(body.percent)
      if (!Number.isFinite(percentNum) || percentNum < 0 || percentNum > 100) {
        return NextResponse.json(
          { error: "Percent must be between 0 and 100" },
          { status: 400 }
        )
      }
      const percentBps = displayPercentToBps(percentNum)

      const activeGoals = await prisma.savingGoal.findMany({
        where: { userId: session.user.id, status: "active" },
        select: { id: true, percentBps: true },
      })

      const validation = validateActiveGoalPercentSum(
        activeGoals,
        percentBps,
        id
      )
      if (!validation.ok) {
        return NextResponse.json({ error: validation.message }, { status: 400 })
      }

      data.percentBps = percentBps
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 })
    }

    const updated = await prisma.savingGoal.update({
      where: { id },
      data,
    })

    return moneyJsonResponse(
      { goal: mapSavingGoalToApi(updated as unknown as Record<string, unknown>, currency) },
      currency
    )
  } catch (error) {
    console.error("Error updating saving goal:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const goal = await prisma.savingGoal.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!goal) {
      return NextResponse.json({ error: "Saving goal not found" }, { status: 404 })
    }

    await prisma.savingGoal.delete({ where: { id } })

    return NextResponse.json({ message: "Saving goal deleted" })
  } catch (error) {
    console.error("Error deleting saving goal:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
