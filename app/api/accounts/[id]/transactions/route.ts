import { NextResponse } from "next/server"
import { moneyJsonResponse } from "@/lib/api-money-response"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { toApiMoney } from "@/lib/investments-api-map"
import {
  AMOUNT_ONLY_FIELDS,
  mapIncomeEntryListToApi,
  mapMoneyListToApi,
} from "@/lib/money-serialize"
import { currencyFromSession } from "@/lib/user-currency"

type AccountRef = { id: string; name: string; bankName: string }

type AccountTransaction = {
  id: string
  type: "income" | "expense" | "transfer" | "investment"
  amount: number
  date: string
  description: string | null
  category: string | null
  account?: AccountRef
  fromAccount?: AccountRef
  toAccount?: AccountRef
  excludeFromAllocation?: boolean
  expenseCategory?: string | null
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const account = await prisma.account.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true, name: true, bankName: true, accountType: true },
    })

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    const currency = currencyFromSession(session.user.displayCurrency)
    const accountRef: AccountRef = {
      id: account.id,
      name: account.name,
      bankName: account.bankName,
    }

    const [incomeRows, expenseRows, transferRows, investmentHoldings] =
      await Promise.all([
        prisma.incomeEntry.findMany({
          where: { userId: session.user.id, accountId: id },
          include: {
            account: { select: { id: true, name: true, bankName: true } },
          },
          orderBy: { date: "desc" },
          take: 200,
        }),
        prisma.expense.findMany({
          where: { userId: session.user.id, accountId: id },
          include: {
            account: { select: { id: true, name: true, bankName: true } },
          },
          orderBy: { date: "desc" },
          take: 200,
        }),
        prisma.transfer.findMany({
          where: {
            userId: session.user.id,
            OR: [{ fromAccountId: id }, { toAccountId: id }],
          },
          include: {
            fromAccount: { select: { id: true, name: true, bankName: true } },
            toAccount: { select: { id: true, name: true, bankName: true } },
          },
          orderBy: { date: "desc" },
          take: 200,
        }),
        account.accountType === "investment"
          ? prisma.investmentHolding.findMany({
              where: { userId: session.user.id, accountId: id },
              orderBy: { date: "desc" },
              take: 200,
            })
          : Promise.resolve([]),
      ])

    const incomeEntries = mapIncomeEntryListToApi(
      incomeRows as unknown as Record<string, unknown>[],
      currency,
    ) as Array<{
      id: string
      amount: number
      description: string | null
      date: string
      account?: AccountRef | null
      excludeFromAllocation?: boolean
    }>

    const expenses = mapMoneyListToApi(
      expenseRows as unknown as Record<string, unknown>[],
      currency,
      AMOUNT_ONLY_FIELDS,
    ) as Array<{
      id: string
      amount: number
      description: string | null
      category: string | null
      expenseCategory: string | null
      date: string
      account?: AccountRef
    }>

    const transfers = mapMoneyListToApi(
      transferRows as unknown as Record<string, unknown>[],
      currency,
      AMOUNT_ONLY_FIELDS,
    ) as Array<{
      id: string
      amount: number
      description: string | null
      category: string | null
      date: string
      fromAccount?: AccountRef
      toAccount?: AccountRef
    }>

    const transactions: AccountTransaction[] = []

    for (const entry of incomeEntries) {
      transactions.push({
        id: entry.id,
        type: "income",
        amount: entry.amount,
        date: entry.date,
        description: entry.description || "Income",
        category: null,
        account: entry.account ?? accountRef,
        excludeFromAllocation: entry.excludeFromAllocation === true,
      })
    }

    for (const expense of expenses) {
      transactions.push({
        id: expense.id,
        type: "expense",
        amount: expense.amount,
        date: expense.date,
        description: expense.description,
        category: expense.category,
        expenseCategory: expense.expenseCategory,
        account: expense.account ?? accountRef,
      })
    }

    for (const transfer of transfers) {
      transactions.push({
        id: transfer.id,
        type: "transfer",
        amount: transfer.amount,
        date: transfer.date,
        description: transfer.description,
        category: transfer.category || null,
        fromAccount: transfer.fromAccount,
        toAccount: transfer.toAccount,
      })
    }

    for (const holding of investmentHoldings) {
      transactions.push({
        id: holding.id,
        type: "investment",
        amount: toApiMoney(holding.amount, currency),
        date: holding.date.toISOString(),
        description: `Investment buy: ${holding.name}`,
        category: "investment",
        account: accountRef,
      })
    }

    transactions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )

    return moneyJsonResponse({ transactions }, currency)
  } catch (error) {
    console.error("Error fetching account transactions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
