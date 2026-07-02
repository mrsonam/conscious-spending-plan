import { NextResponse } from "next/server"
import { moneyJsonResponse } from "@/lib/api-money-response"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { addMinor } from "@/lib/money"
import { computeHoldingAmountMinor } from "@/lib/investment-money"
import { currencyFromSession } from "@/lib/user-currency"
import { toApiMoney, sumAmountMinor } from "@/lib/investments-api-map"
import { serializeMoneyForApi } from "@/lib/money-api"
import { addShares, compareShares, sharesToApiString } from "@/lib/shares"
import { Decimal } from "@prisma/client/runtime/library"

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = currencyFromSession(session.user.displayCurrency)
    const body = await request.json()
    const {
      investmentAccountId,
      amount,
      investmentName,
      pricePerUnit,
      numberOfShares,
      brokerageFee,
      date,
    } = body

    if (!investmentAccountId || !investmentName) {
      return NextResponse.json(
        { error: "Investment account and investment name are required" },
        { status: 400 }
      )
    }

    let computed
    try {
      computed = computeHoldingAmountMinor(
        { amount, numberOfShares, pricePerUnit, brokerageFee },
        currency
      )
    } catch (e) {
      const message = e instanceof Error ? e.message : "Invalid investment data"
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const investmentAccount = await tx.account.findFirst({
        where: {
          id: investmentAccountId,
          userId: session.user.id,
          accountType: "investment",
        },
      })

      if (!investmentAccount) {
        throw new Error("Investment account not found")
      }

      // Atomic check-and-decrement: WHERE balance >= amount prevents overdraft
      // under concurrent requests.
      const updated = await tx.account.updateMany({
        where: { id: investmentAccount.id, balance: { gte: computed.amountMinor } },
        data: { balance: { decrement: computed.amountMinor } },
      })
      if (updated.count === 0) {
        throw new Error(
          "Insufficient funds in investment account. Transfer money to this account first using the Transfer functionality."
        )
      }

      const holding = await tx.investmentHolding.create({
        data: {
          userId: session.user.id,
          accountId: investmentAccount.id,
          name: investmentName,
          amount: computed.amountMinor,
          pricePerUnit: computed.pricePerUnitMinor,
          numberOfShares: computed.numberOfShares,
          brokerageFee: computed.brokerageFeeMinor,
          date: date ? new Date(date) : new Date(),
        },
      })

      return { investmentAccount, holding }
    })

    const mapHolding = (h: typeof result.holding) => ({
      ...h,
      amount: serializeMoneyForApi(h.amount, currency),
      pricePerUnit:
        h.pricePerUnit != null
          ? serializeMoneyForApi(h.pricePerUnit, currency)
          : null,
      brokerageFee:
        h.brokerageFee != null
          ? serializeMoneyForApi(h.brokerageFee, currency)
          : null,
      numberOfShares: sharesToApiString(h.numberOfShares),
    })

    return moneyJsonResponse(
      {
        investmentAccount: {
          ...result.investmentAccount,
          balance: serializeMoneyForApi(
            result.investmentAccount.balance,
            currency
          ),
        },
        holding: mapHolding(result.holding),
      },
      currency,
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error("Error creating investment:", error)
    const message =
      error instanceof Error ? error.message : "Internal server error"
    // Only expose known, user-facing messages; anything else stays generic.
    if (message === "Investment account not found") {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    if (message.startsWith("Insufficient funds")) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = currencyFromSession(session.user.displayCurrency)
    const toD = (m: bigint) => toApiMoney(m, currency)

    const [accounts, dividends] = await Promise.all([
      prisma.account.findMany({
        where: {
          userId: session.user.id,
          accountType: "investment",
        },
        include: {
          investmentHoldings: { orderBy: { date: "desc" } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.investmentDividend.findMany({
        where: { userId: session.user.id },
      }),
    ])

    const now = new Date()
    const yearStart = new Date(now.getFullYear(), 0, 1)
    const dividendAllTimeMinor = sumAmountMinor(dividends)
    const dividendYtdMinor = sumAmountMinor(
      dividends.filter((d) => d.date >= yearStart)
    )

    const result = accounts.map((account) => {
      const investedMinor = sumAmountMinor(account.investmentHoldings)

      const holdingsByName: Record<string, typeof account.investmentHoldings> =
        {}
      account.investmentHoldings.forEach((h) => {
        const key = h.name.toLowerCase().trim()
        if (!holdingsByName[key]) holdingsByName[key] = []
        holdingsByName[key].push(h)
      })

      const mergedHoldings = Object.entries(holdingsByName).map(([, holdings]) => {
        const totalSharesStr = holdings.reduce(
          (sum, h) => addShares(sum, h.numberOfShares),
          "0",
        )
        const totalShares = Number(totalSharesStr)
        const totalAmountMinor = sumAmountMinor(holdings)

        const averagePrice =
          compareShares(totalSharesStr, "0") > 0
            ? toD(totalAmountMinor) / totalShares
            : totalAmountMinor > 0n
              ? toD(totalAmountMinor) / holdings.length
              : 0

        const purchases = holdings
          .map((h) => ({
            id: h.id,
            pricePerUnit:
              h.pricePerUnit != null ? toD(h.pricePerUnit) : null,
            numberOfShares: sharesToApiString(h.numberOfShares),
            amount: toD(h.amount),
            brokerageFee: h.brokerageFee != null ? toD(h.brokerageFee) : 0,
            date: h.date,
          }))
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          )

        const nameKey = holdings[0].name.trim().toLowerCase()
        const dividendIncomeMinor = sumAmountMinor(
          dividends.filter(
            (d) =>
              d.accountId === account.id &&
              d.name.trim().toLowerCase() === nameKey
          )
        )

        return {
          name: holdings[0].name,
          totalShares,
          totalAmount: toD(totalAmountMinor),
          averagePrice,
          purchases,
          dividendIncome: toD(dividendIncomeMinor),
          firstPurchaseDate: holdings.reduce(
            (earliest, h) => (h.date < earliest ? h.date : earliest),
            holdings[0].date
          ),
          lastPurchaseDate: holdings.reduce(
            (latest, h) => (h.date > latest ? h.date : latest),
            holdings[0].date
          ),
        }
      })

      const accountDividendMinor = sumAmountMinor(
        dividends.filter((d) => d.accountId === account.id)
      )

      return {
        id: account.id,
        name: account.name,
        bankName: account.bankName,
        balance: toD(account.balance),
        investedAmount: toD(investedMinor),
        totalValue: toD(addMinor(investedMinor, account.balance)),
        dividendIncomeTotal: toD(accountDividendMinor),
        holdings: mergedHoldings,
      }
    })

    const recentDividends = [...dividends]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 24)
      .map((d) => ({
        id: d.id,
        date: d.date.toISOString(),
        amount: toD(d.amount),
        name: d.name,
        accountId: d.accountId,
      }))

    return moneyJsonResponse(
      {
        accounts: result,
        dividendYtd: toD(dividendYtdMinor),
        dividendAllTime: toD(dividendAllTimeMinor),
        recentDividends,
      },
      currency
    )
  } catch (error) {
    console.error("Error fetching investments:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}