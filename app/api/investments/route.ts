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
      brokerageFee,
      date,
    } = body

    if (!investmentAccountId || !investmentName) {
      return NextResponse.json(
        { error: "Investment account and investment name are required" },
        { status: 400 }
      )
    }

    // Calculate amount from numberOfShares × pricePerUnit (+ optional brokerageFee) if provided,
    // otherwise use amount directly
    let numericAmount: number
    const numericBrokerageFee = brokerageFee ? Number(brokerageFee) : 0

    if (numberOfShares && pricePerUnit) {
      const numShares = Number(numberOfShares)
      const pricePerUnitNum = Number(pricePerUnit)
      
      if (numShares <= 0 || pricePerUnitNum <= 0) {
        return NextResponse.json(
          { error: "Number of shares and price per unit must be greater than 0" },
          { status: 400 }
        )
      }
      
      numericAmount = numShares * pricePerUnitNum + Math.max(0, numericBrokerageFee)
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
          // Cast to any to avoid Prisma type mismatch until client is regenerated
          brokerageFee: Math.max(0, numericBrokerageFee),
          date: investmentDate,
        } as any,
      })

      // Investment holdings are treated as assets, not expenses
      // They will appear in Statement as "investment" type transactions
      // and contribute to net worth calculation

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

      // Group holdings by name to merge same shares
      const holdingsByName: Record<string, typeof account.investmentHoldings> = {}
      account.investmentHoldings.forEach((h) => {
        const key = h.name.toLowerCase().trim()
        if (!holdingsByName[key]) {
          holdingsByName[key] = []
        }
        holdingsByName[key].push(h)
      })

      // Create merged holdings with individual purchase details
      const mergedHoldings = Object.entries(holdingsByName).map(([key, holdings]) => {
        // Calculate totals
        const totalShares = holdings.reduce(
          (sum, h) => sum + (h.numberOfShares || 0),
          0
        )
        const totalAmount = holdings.reduce((sum, h) => sum + h.amount, 0)
        
        // Calculate weighted average price
        let averagePrice = 0
        if (totalShares > 0) {
          const totalCost = holdings.reduce((sum, h) => {
            if (h.numberOfShares && h.pricePerUnit) {
              return sum + h.numberOfShares * h.pricePerUnit
            }
            return sum + h.amount
          }, 0)
          averagePrice = totalCost / totalShares
        } else if (totalAmount > 0) {
          // Fallback: if no shares info, use amount-based average
          averagePrice = totalAmount / holdings.length
        }

        // Get individual purchases (sorted by date, newest first)
        const purchases = holdings
          .map((h) => ({
            id: h.id,
            pricePerUnit: h.pricePerUnit,
            numberOfShares: h.numberOfShares,
            amount: h.amount,
            brokerageFee: h.brokerageFee || 0,
            date: h.date,
          }))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        return {
          name: holdings[0].name, // Use the original name (preserving case)
          totalShares,
          totalAmount,
          averagePrice,
          purchases, // Individual purchase details
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

      return {
        id: account.id,
        name: account.name,
        bankName: account.bankName,
        balance: account.balance,
        investedAmount,
        totalValue: investedAmount + account.balance,
        holdings: mergedHoldings,
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

