import { NextResponse } from "next/server"
import { moneyJsonResponse } from "@/lib/api-money-response"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isFundCategory } from "@/lib/category-bucket-transfer-shared"
import { listCategoryBucketTransfersForMonth } from "@/lib/category-bucket-transfer-api"
import {
  AMOUNT_ONLY_FIELDS,
  mapMoneyListToApi,
} from "@/lib/money-serialize"
import { currencyFromSession } from "@/lib/user-currency"
import type { FundCategory } from "@/lib/fund-allocation-fields"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ category: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { category } = await params
    if (!isFundCategory(category)) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    const currency = currencyFromSession(session.user.displayCurrency)
    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get("month")
    const yearParam = searchParams.get("year")

    const now = new Date()
    const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1
    const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear()

    if (
      !Number.isInteger(month) || month < 1 || month > 12 ||
      !Number.isInteger(year) || year < 2000 || year > 2100
    ) {
      return NextResponse.json({ error: "Invalid month or year" }, { status: 400 })
    }

    const startOfMonth = new Date(year, month - 1, 1)
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999)
    const fundCategory = category as FundCategory

    const [expenseRows, transferRows, bucketTransfers] = await Promise.all([
      fundCategory !== "investment"
        ? prisma.expense.findMany({
            where: {
              userId: session.user.id,
              category: fundCategory,
              date: { gte: startOfMonth, lte: endOfMonth },
            },
            include: {
              account: { select: { id: true, name: true, bankName: true } },
            },
            orderBy: { date: "desc" },
            take: 200,
          })
        : Promise.resolve([]),
      // Tracking math counts category-tagged transfers against every pillar
      // (remaining = available − spent − transferred), so list them for all.
      prisma.transfer.findMany({
        where: {
          userId: session.user.id,
          category: fundCategory,
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        include: {
          fromAccount: { select: { id: true, name: true, bankName: true } },
          toAccount: { select: { id: true, name: true, bankName: true } },
        },
        orderBy: { date: "desc" },
        take: 200,
      }),
      listCategoryBucketTransfersForMonth(
        session.user.id,
        month,
        year,
        currency,
      ),
    ])

    const expenses = mapMoneyListToApi(
      expenseRows as unknown as Record<string, unknown>[],
      currency,
      AMOUNT_ONLY_FIELDS,
    ) as Array<{
      id: string
      amount: number
      description: string | null
      expenseCategory: string | null
      date: string
      account?: { id: string; name: string; bankName: string }
    }>

    const transfers = mapMoneyListToApi(
      transferRows as unknown as Record<string, unknown>[],
      currency,
      AMOUNT_ONLY_FIELDS,
    ) as Array<{
      id: string
      amount: number
      description: string | null
      date: string
      fromAccount?: { id: string; name: string; bankName: string }
      toAccount?: { id: string; name: string; bankName: string }
    }>

    type CategoryTransaction = {
      id: string
      type: "expense" | "transfer" | "bucket_transfer"
      amount: number
      date: string
      description: string | null
      expenseCategory?: string | null
      fromCategory?: string
      toCategory?: string
      accountLabel?: string
    }

    const transactions: CategoryTransaction[] = []

    for (const expense of expenses) {
      transactions.push({
        id: expense.id,
        type: "expense",
        amount: expense.amount,
        date: expense.date,
        description: expense.description,
        expenseCategory: expense.expenseCategory,
        accountLabel: expense.account
          ? `${expense.account.bankName} · ${expense.account.name}`
          : undefined,
      })
    }

    for (const transfer of transfers) {
      transactions.push({
        id: transfer.id,
        type: "transfer",
        amount: transfer.amount,
        date: transfer.date,
        description: transfer.description,
        accountLabel: transfer.fromAccount && transfer.toAccount
          ? `${transfer.fromAccount.name} → ${transfer.toAccount.name}`
          : undefined,
      })
    }

    for (const bt of bucketTransfers) {
      if (bt.fromCategory !== fundCategory && bt.toCategory !== fundCategory) continue
      transactions.push({
        id: bt.id,
        type: "bucket_transfer",
        amount: bt.amount,
        date: bt.createdAt,
        description:
          bt.fromCategory === fundCategory
            ? `Moved to ${bt.toCategory}`
            : `Moved from ${bt.fromCategory}`,
        fromCategory: bt.fromCategory,
        toCategory: bt.toCategory,
      })
    }

    transactions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )

    return moneyJsonResponse({ transactions }, currency)
  } catch (error) {
    console.error("Error fetching category transactions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
