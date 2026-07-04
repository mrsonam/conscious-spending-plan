import { NextResponse } from "next/server"
import { moneyJsonResponse } from "@/lib/api-money-response"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  mapSavingGoalListToApi,
  mapSavingGoalToApi,
} from "@/lib/saving-goal-api-map"
import {
  bpsToDisplayPercent,
  displayPercentToBps,
  parseOptionalTargetMinor,
  sumGoalPercentBps,
  validateActiveGoalPercentSum,
} from "@/lib/saving-goal-allocation"
import { loadGeneralSavingsContext } from "@/lib/saving-goal-general-savings"
import { loadSavingGoalProjections } from "@/lib/saving-goal-projection"
import { ensurePreTrackingSavingsBalances } from "@/lib/pre-tracking-savings"
import { serializeMoneyForApi } from "@/lib/money-api"
import { currencyFromSession, getUserDisplayCurrency } from "@/lib/user-currency"

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

    const goals = await prisma.savingGoal.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    })

    const activeGoals = goals.filter((g) => g.status === "active")
    const assignedBps = sumGoalPercentBps(activeGoals)

    await ensurePreTrackingSavingsBalances(session.user.id)

    const [{ availableMinor }, projections] = await Promise.all([
      loadGeneralSavingsContext(prisma, session.user.id),
      loadSavingGoalProjections(session.user.id, goals, currency),
    ])

    const goalsOut = mapSavingGoalListToApi(
      goals as unknown as Record<string, unknown>[],
      currency
    ).map((g) => ({ ...g, projection: projections[g.id] ?? null }))

    return moneyJsonResponse(
      {
        goals: goalsOut,
        summary: {
          activeCount: activeGoals.length,
          assignedPercent: bpsToDisplayPercent(assignedBps),
          unassignedPercent: bpsToDisplayPercent(10000 - assignedBps),
          generalSavingsAvailable: serializeMoneyForApi(availableMinor, currency),
        },
      },
      currency
    )
  } catch (error) {
    console.error("Error fetching saving goals:", error)
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
    const body = (await request.json()) as {
      name?: string
      target?: number | string | null
      percent?: number | string
    }

    const name = body.name?.trim()
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const targetParsed = parseOptionalTargetMinor(body.target, currency)
    if (!targetParsed.ok) {
      return NextResponse.json({ error: targetParsed.error }, { status: 400 })
    }

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

    const validation = validateActiveGoalPercentSum(activeGoals, percentBps)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: 400 })
    }

    const goal = await prisma.savingGoal.create({
      data: {
        userId: session.user.id,
        name,
        targetMinor: targetParsed.value,
        percentBps,
      },
    })

    return moneyJsonResponse(
      { goal: mapSavingGoalToApi(goal as unknown as Record<string, unknown>, currency) },
      currency,
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating saving goal:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
