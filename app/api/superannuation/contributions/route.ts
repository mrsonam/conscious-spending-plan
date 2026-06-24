import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { currencyFromSession } from "@/lib/user-currency"
import { parseMoneyFromApi, serializeMoneyForApi } from "@/lib/money-api"
import { coerceMinor, addMinor } from "@/lib/money"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const currency = currencyFromSession(session.user.displayCurrency)
  const body = (await request.json()) as {
    superAccountId?: string
    amount?: unknown
    type?: string
    date?: string
    description?: string
  }

  if (!body.superAccountId) {
    return NextResponse.json({ error: "Super account is required" }, { status: 400 })
  }
  if (body.amount == null) {
    return NextResponse.json({ error: "Amount is required" }, { status: 400 })
  }

  const validTypes = ["employer", "salary_sacrifice", "personal", "government"]
  const contribType = body.type ?? "employer"
  if (!validTypes.includes(contribType)) {
    return NextResponse.json({ error: "Invalid contribution type" }, { status: 400 })
  }

  const account = await prisma.superannuationAccount.findFirst({
    where: { id: body.superAccountId, userId: session.user.id },
  })
  if (!account) {
    return NextResponse.json({ error: "Super account not found" }, { status: 404 })
  }

  const amountMinor = parseMoneyFromApi(body.amount, currency)

  const [contribution] = await prisma.$transaction([
    prisma.superannuationContribution.create({
      data: {
        userId: session.user.id,
        superAccountId: body.superAccountId,
        amount: amountMinor,
        type: contribType,
        date: body.date ? new Date(body.date) : new Date(),
        description: body.description?.trim() || null,
      },
    }),
    prisma.superannuationAccount.update({
      where: { id: body.superAccountId },
      data: { balance: addMinor(account.balance, amountMinor) },
    }),
  ])

  return NextResponse.json({
    id: contribution.id,
    amount: serializeMoneyForApi(coerceMinor(contribution.amount), currency),
    type: contribution.type,
    date: contribution.date.toISOString(),
    description: contribution.description,
    newBalance: serializeMoneyForApi(
      coerceMinor(addMinor(account.balance, amountMinor)),
      currency,
    ),
  })
}

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "Contribution ID is required" }, { status: 400 })
  }

  const contribution = await prisma.superannuationContribution.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!contribution) {
    return NextResponse.json({ error: "Contribution not found" }, { status: 404 })
  }

  const account = await prisma.superannuationAccount.findUnique({
    where: { id: contribution.superAccountId },
  })

  await prisma.$transaction([
    prisma.superannuationContribution.delete({ where: { id } }),
    ...(account
      ? [
          prisma.superannuationAccount.update({
            where: { id: contribution.superAccountId },
            data: {
              balance: {
                decrement: contribution.amount,
              },
            },
          }),
        ]
      : []),
  ])

  return NextResponse.json({ success: true })
}
