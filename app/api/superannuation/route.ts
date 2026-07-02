import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { currencyFromSession } from "@/lib/user-currency"
import { parseMoneyFromApi, serializeMoneyForApi } from "@/lib/money-api"
import { coerceMinor } from "@/lib/money"
import { readJsonBody, routeErrorResponse } from "@/lib/route-error"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = currencyFromSession(session.user.displayCurrency)

    const accounts = await prisma.superannuationAccount.findMany({
      where: { userId: session.user.id },
      include: {
        contributions: {
          orderBy: { date: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const serialized = accounts.map((a) => ({
      id: a.id,
      name: a.name,
      fundType: a.fundType,
      provider: a.provider,
      memberNumber: a.memberNumber,
      employerName: a.employerName,
      balance: serializeMoneyForApi(coerceMinor(a.balance), currency),
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      contributions: a.contributions.map((c) => ({
        id: c.id,
        amount: serializeMoneyForApi(coerceMinor(c.amount), currency),
        type: c.type,
        date: c.date.toISOString(),
        description: c.description,
      })),
    }))

    const totalBalance = accounts.reduce(
      (s, a) => s + serializeMoneyForApi(coerceMinor(a.balance), currency),
      0,
    )

    return NextResponse.json({ accounts: serialized, totalBalance })
  } catch (error) {
    return routeErrorResponse(error, "Error fetching super accounts")
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = currencyFromSession(session.user.displayCurrency)
    const body = await readJsonBody<{
      name?: string
      fundType?: string
      provider?: string
      memberNumber?: string
      employerName?: string
      balance?: unknown
    }>(request)
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: "Fund name is required" },
        { status: 400 },
      )
    }

    let balanceMinor = BigInt(0)
    if (body.balance != null) {
      try {
        balanceMinor = parseMoneyFromApi(body.balance, currency)
      } catch {
        return NextResponse.json({ error: "Balance must be a valid number" }, { status: 400 })
      }
    }

    const account = await prisma.superannuationAccount.create({
      data: {
        userId: session.user.id,
        name: body.name.trim(),
        fundType: body.fundType?.trim() || null,
        provider: body.provider?.trim() || null,
        memberNumber: body.memberNumber?.trim() || null,
        employerName: body.employerName?.trim() || null,
        balance: balanceMinor,
      },
    })

    return NextResponse.json({
      id: account.id,
      name: account.name,
      fundType: account.fundType,
      provider: account.provider,
      memberNumber: account.memberNumber,
      employerName: account.employerName,
      balance: serializeMoneyForApi(coerceMinor(account.balance), currency),
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
      contributions: [],
    })
  } catch (error) {
    return routeErrorResponse(error, "Error creating super account")
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = currencyFromSession(session.user.displayCurrency)
    const body = await readJsonBody<{
      id?: string
      name?: string
      fundType?: string
      provider?: string
      memberNumber?: string
      employerName?: string
      balance?: unknown
    }>(request)
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    if (!body.id) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 })
    }

    const existing = await prisma.superannuationAccount.findFirst({
      where: { id: body.id, userId: session.user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (body.name?.trim()) data.name = body.name.trim()
    if (body.fundType !== undefined) data.fundType = body.fundType?.trim() || null
    if (body.provider !== undefined) data.provider = body.provider?.trim() || null
    if (body.memberNumber !== undefined) data.memberNumber = body.memberNumber?.trim() || null
    if (body.employerName !== undefined) data.employerName = body.employerName?.trim() || null
    if (body.balance != null) {
      try {
        data.balance = parseMoneyFromApi(body.balance, currency)
      } catch {
        return NextResponse.json({ error: "Balance must be a valid number" }, { status: 400 })
      }
    }

    const updated = await prisma.superannuationAccount.update({
      where: { id: body.id },
      data,
    })

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      fundType: updated.fundType,
      provider: updated.provider,
      memberNumber: updated.memberNumber,
      employerName: updated.employerName,
      balance: serializeMoneyForApi(coerceMinor(updated.balance), currency),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    })
  } catch (error) {
    return routeErrorResponse(error, "Error updating super account")
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 })
    }

    const existing = await prisma.superannuationAccount.findFirst({
      where: { id, userId: session.user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    await prisma.superannuationAccount.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return routeErrorResponse(error, "Error deleting super account")
  }
}
