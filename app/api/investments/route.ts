import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Create a new investment: record an investment holding and deduct from investment account balance.
// Money should already be in the investment account (transferred separately).
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      investmentAccountId,
      amount,
      investmentName,
      pricePerUnit,
      numberOfShares,
      date,
    } = body

    if (!investmentAccountId || !investmentName) {
      return NextResponse.json(
        { error: "Investment account and investment name are required" },
        { status: 400 }
      )
    }

    // Calculate amount from numberOfShares × pricePerUnit if provided, otherwise use amount directly
    let numericAmount: number
    if (numberOfShares && pricePerUnit) {
      const numShares = Number(numberOfShares)
      const pricePerUnitNum = Number(pricePerUnit)
      
      if (numShares <= 0 || pricePerUnitNum <= 0) {
        return NextResponse.json(
          { error: "Number of shares and price per unit must be greater than 0" },
          { status: 400 }
        )
      }
      
      numericAmount = numShares * pricePerUnitNum
    } else if (amount) {
      numericAmount = Number(amount)
      if (!numericAmount || numericAmount <= 0) {
        return NextResponse.json(
          { error: "Amount must be greater than 0" },
          { status: 400 }
        )
      }
    } else {
      return NextResponse.json(
        { error: "Either provide amount, or both number of shares and price per unit" },
        { status: 400 }
      )
    }

    const numericPricePerUnit = pricePerUnit ? Number(pricePerUnit) : 0
    const numericNumberOfShares = numberOfShares ? Number(numberOfShares) : 0

    const result = await prisma.$transaction(async (tx) => {
      // Verify investment account
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

      if (investmentAccount.balance < numericAmount) {
        throw new Error("Insufficient funds in investment account. Transfer money to this account first using the Transfer functionality.")
      }

      // Deduct from investment account balance
      await tx.account.update({
        where: { id: investmentAccount.id },
        data: { balance: { decrement: numericAmount } },
      })

      const investmentDate = date ? new Date(date) : new Date()

      // Record investment holding
      const holding = await tx.investmentHolding.create({
        data: {
          userId: session.user.id,
          accountId: investmentAccount.id,
          name: investmentName,
          amount: numericAmount,
          pricePerUnit: numericPricePerUnit,
          numberOfShares: numericNumberOfShares,
          date: investmentDate,
        },
      })

      return {
        investmentAccount,
        holding,
      }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    console.error("Error creating investment:", error)
    const message = error instanceof Error ? error.message : "Internal server error"
    const status = message === "Investment account not found"
      ? 404
      : message === "Insufficient funds in investment account. Transfer money to this account first using the Transfer functionality."
      ? 400
      : 500
    return NextResponse.json({ error: message }, { status })
  }
}

// Get summary of investment accounts and their holdings
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const accounts = await prisma.account.findMany({
      where: {
        userId: session.user.id,
        accountType: "investment",
      },
      include: {
        investmentHoldings: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    const result = accounts.map((account) => {
      const investedAmount = account.investmentHoldings.reduce(
        (sum, h) => sum + h.amount,
        0
      )

      return {
        id: account.id,
        name: account.name,
        bankName: account.bankName,
        balance: account.balance,
        investedAmount,
        totalValue: investedAmount + account.balance,
        holdings: account.investmentHoldings.map((h) => ({
          id: h.id,
          name: h.name,
          amount: h.amount,
          pricePerUnit: h.pricePerUnit,
          numberOfShares: h.numberOfShares,
          date: h.date,
        })),
      }
    })

    return NextResponse.json({ accounts: result })
  } catch (error) {
    console.error("Error fetching investments:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

