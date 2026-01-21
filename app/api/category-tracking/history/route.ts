import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getCurrentMonthYear } from "@/lib/monthly-tracking"

/**
 * Get historical spending data for the last 6 months for trend analysis
 */
export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { month: currentMonth, year: currentYear } = getCurrentMonthYear()
    
    // Get expenses for the last 6 months
    const months: Array<{ month: number; year: number; label: string }> = []
    for (let i = 0; i < 6; i++) {
      const date = new Date(currentYear, currentMonth - 1 - i, 1)
      const month = date.getMonth() + 1
      const year = date.getFullYear()
      const label = date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
      months.push({ month, year, label })
    }
    months.reverse() // Oldest to newest

    const history: Record<string, Array<{ month: string; allocated: number; spent: number; remaining: number }>> = {
      fixedCosts: [],
      investment: [],
      savings: [],
      guiltFreeSpending: [],
    }

    const fundAllocation = await prisma.fundAllocation.findUnique({
      where: { userId: session.user.id }
    })

    if (!fundAllocation) {
      return NextResponse.json({ history })
    }

    // Helper to calculate allocations
    const calculateAllocations = (incomeAmount: number) => {
      let fc = 0, inv = 0, gfs = 0, sav = 0

      if (fundAllocation.fixedCostsType === "fixed") {
        fc = fundAllocation.fixedCostsValue
      } else {
        fc = (incomeAmount * fundAllocation.fixedCostsValue) / 100
      }

      if (fundAllocation.investmentType === "fixed") {
        inv = fundAllocation.investmentValue
      } else {
        inv = (incomeAmount * fundAllocation.investmentValue) / 100
      }

      if (fundAllocation.guiltFreeSpendingType === "fixed") {
        gfs = fundAllocation.guiltFreeSpendingValue
      } else {
        gfs = (incomeAmount * fundAllocation.guiltFreeSpendingValue) / 100
      }

      if (fundAllocation.savingsType === "fixed") {
        sav = fundAllocation.savingsValue
      } else {
        sav = (incomeAmount * fundAllocation.savingsValue) / 100
      }

      return { fixedCosts: fc, investment: inv, guiltFreeSpending: gfs, savings: sav }
    }

    // Batch fetch all data for all months at once
    const oldestMonth = months[0]
    const newestMonth = months[months.length - 1]
    const overallStart = new Date(oldestMonth.year, oldestMonth.month - 1, 1)
    const overallEnd = new Date(newestMonth.year, newestMonth.month, 0, 23, 59, 59, 999)

    // Fetch all income entries, expenses, and investments for the 6-month period in parallel
    const [allIncomeEntries, allExpenses, allInvestments] = await Promise.all([
      prisma.incomeEntry.findMany({
        where: {
          userId: session.user.id,
          createdAt: {
            gte: overallStart,
            lte: overallEnd,
          },
          excludeFromAllocation: false,
        } as any,
        select: {
          amount: true,
          createdAt: true,
        },
      }),
      prisma.expense.findMany({
        where: {
          userId: session.user.id,
          date: {
            gte: overallStart,
            lte: overallEnd,
          },
          category: {
            in: ["fixedCosts", "investment", "savings", "guiltFreeSpending"],
          },
        },
        select: {
          amount: true,
          category: true,
          date: true,
        },
      }),
      // Fetch all investment holdings for the period
      prisma.investmentHolding.findMany({
        where: {
          userId: session.user.id,
          date: {
            gte: overallStart,
            lte: overallEnd,
          },
        },
        select: {
          amount: true,
          date: true,
        },
      }),
    ])

    // Process each month using the pre-fetched data
    for (const { month, year, label } of months) {
      const startOfMonth = new Date(year, month - 1, 1)
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999)

      // Filter income entries for this month (already filtered by excludeFromAllocation)
      const monthEntries = allIncomeEntries.filter(entry => {
        const entryDate = new Date(entry.createdAt)
        return entryDate >= startOfMonth && entryDate <= endOfMonth
      })

      // Calculate allocations
      let totalFixedCosts = 0
      let totalInvestment = 0
      let totalGuiltFreeSpending = 0
      let totalSavings = 0

      for (const entry of monthEntries) {
        const allocations = calculateAllocations(entry.amount)
        totalFixedCosts += allocations.fixedCosts
        totalInvestment += allocations.investment
        totalGuiltFreeSpending += allocations.guiltFreeSpending
        totalSavings += allocations.savings
      }

      // Apply caps
      if (fundAllocation.fixedCostsCap !== null && totalFixedCosts > fundAllocation.fixedCostsCap) {
        totalFixedCosts = fundAllocation.fixedCostsCap
      }
      if (fundAllocation.investmentCap !== null && totalInvestment > fundAllocation.investmentCap) {
        totalInvestment = fundAllocation.investmentCap
      }
      if (fundAllocation.guiltFreeSpendingCap !== null && totalGuiltFreeSpending > fundAllocation.guiltFreeSpendingCap) {
        totalGuiltFreeSpending = fundAllocation.guiltFreeSpendingCap
      }
      if (fundAllocation.savingsCap !== null && totalSavings > fundAllocation.savingsCap) {
        totalSavings = fundAllocation.savingsCap
      }

      // Filter expenses for this month
      const monthExpenses = allExpenses.filter(expense => {
        const expenseDate = new Date(expense.date)
        return expenseDate >= startOfMonth && expenseDate <= endOfMonth
      })

      // Filter investments for this month
      const monthInvestments = allInvestments.filter(investment => {
        const investmentDate = new Date(investment.date)
        return investmentDate >= startOfMonth && investmentDate <= endOfMonth
      })

      const spent: Record<string, number> = {
        fixedCosts: 0,
        investment: 0,
        savings: 0,
        guiltFreeSpending: 0,
      }

      for (const expense of monthExpenses) {
        if (expense.category && spent[expense.category] !== undefined) {
          // For investment category, don't count expenses as "spent" - only investment holdings count
          if (expense.category !== "investment") {
            spent[expense.category] += expense.amount
          }
        }
      }

      // Add investment holdings to investment category spent
      // Only investment holdings count as "spent" for investment category, not expenses
      for (const investment of monthInvestments) {
        spent.investment += investment.amount
      }

      history.fixedCosts.push({
        month: label,
        allocated: Math.round(totalFixedCosts * 100) / 100,
        spent: Math.round(spent.fixedCosts * 100) / 100,
        remaining: Math.round((totalFixedCosts - spent.fixedCosts) * 100) / 100,
      })

      history.investment.push({
        month: label,
        allocated: Math.round(totalInvestment * 100) / 100,
        spent: Math.round(spent.investment * 100) / 100,
        remaining: Math.round((totalInvestment - spent.investment) * 100) / 100,
      })

      history.savings.push({
        month: label,
        allocated: Math.round(totalSavings * 100) / 100,
        spent: Math.round(spent.savings * 100) / 100,
        remaining: Math.round((totalSavings - spent.savings) * 100) / 100,
      })

      history.guiltFreeSpending.push({
        month: label,
        allocated: Math.round(totalGuiltFreeSpending * 100) / 100,
        spent: Math.round(spent.guiltFreeSpending * 100) / 100,
        remaining: Math.round((totalGuiltFreeSpending - spent.guiltFreeSpending) * 100) / 100,
      })
    }

    return NextResponse.json({ history })
  } catch (error) {
    console.error("Error fetching category history:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
