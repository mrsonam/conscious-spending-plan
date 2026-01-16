import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getCurrentMonthYear, getCurrentMonthIncomeEntries } from "@/lib/monthly-tracking"

export async function GET(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const latest = searchParams.get("latest") === "true"
    const currentMonth = searchParams.get("currentMonth") === "true"

    if (currentMonth) {
      // Get all income entries for the current month ONLY
      // This ensures monthly tracking - each month is independent
      const allMonthEntries = await getCurrentMonthIncomeEntries(session.user.id)
      
      // Calculate total income including cash accounts (for display purposes)
      const totalIncomeIncludingCash = allMonthEntries.reduce((sum, entry) => sum + entry.amount, 0)
      
      // Filter out cash account entries for budget calculations
      const monthEntries = allMonthEntries.filter(entry => {
        return !entry.account || entry.account.accountType !== "cash"
      })

      if (monthEntries.length === 0) {
        // If no non-cash entries, return breakdown with total income including cash but no allocation
        return NextResponse.json({ 
          breakdown: {
            income: totalIncomeIncludingCash,
            fixedCosts: 0,
            savings: 0,
            investment: 0,
            guiltFreeSpending: 0,
            total: 0, // No allocation (all income is cash)
          }, 
          entries: allMonthEntries 
        })
      }

      // Sum all income entries for the month (excluding cash accounts) for budget allocation
      const totalIncome = monthEntries.reduce((sum, entry) => sum + entry.amount, 0)

      // Get fund allocation to calculate breakdown
      const fundAllocation = await prisma.fundAllocation.findUnique({
        where: { userId: session.user.id }
      })

      if (!fundAllocation) {
        return NextResponse.json({ breakdown: null, entries: monthEntries })
      }

      // Helper function to calculate allocations for a given income amount
      const calculateAllocations = (incomeAmount: number) => {
        let fc = 0
        let inv = 0
        let gfs = 0

        if (fundAllocation.fixedCostsType === "fixed") {
          fc = Math.min(fundAllocation.fixedCostsValue, incomeAmount)
        } else {
          fc = (incomeAmount * fundAllocation.fixedCostsValue) / 100
        }

        if (fundAllocation.investmentType === "fixed") {
          inv = Math.min(fundAllocation.investmentValue, incomeAmount)
        } else {
          inv = (incomeAmount * fundAllocation.investmentValue) / 100
        }

        if (fundAllocation.guiltFreeSpendingType === "fixed") {
          gfs = Math.min(fundAllocation.guiltFreeSpendingValue, incomeAmount)
        } else {
          gfs = (incomeAmount * fundAllocation.guiltFreeSpendingValue) / 100
        }

        return { fixedCosts: fc, investment: inv, guiltFreeSpending: gfs }
      }

      // Calculate allocations for each entry and sum them up
      let totalFixedCosts = 0
      let totalInvestment = 0
      let totalGuiltFreeSpending = 0

      for (const entry of monthEntries) {
        const allocations = calculateAllocations(entry.amount)
        totalFixedCosts += allocations.fixedCosts
        totalInvestment += allocations.investment
        totalGuiltFreeSpending += allocations.guiltFreeSpending
      }

      // Apply caps to the totals
      let excessToSavings = 0
      let fixedCosts = totalFixedCosts
      let investment = totalInvestment
      let guiltFreeSpending = totalGuiltFreeSpending

      // Check fixed costs cap
      if (fundAllocation.fixedCostsCap !== null && fundAllocation.fixedCostsCap !== undefined) {
        if (fixedCosts > fundAllocation.fixedCostsCap) {
          const excess = fixedCosts - fundAllocation.fixedCostsCap
          fixedCosts = fundAllocation.fixedCostsCap
          excessToSavings += excess
        }
      }

      // Check investment cap
      if (fundAllocation.investmentCap !== null && fundAllocation.investmentCap !== undefined) {
        if (investment > fundAllocation.investmentCap) {
          const excess = investment - fundAllocation.investmentCap
          investment = fundAllocation.investmentCap
          excessToSavings += excess
        }
      }

      // Check guilt-free spending cap
      if (fundAllocation.guiltFreeSpendingCap !== null && fundAllocation.guiltFreeSpendingCap !== undefined) {
        if (guiltFreeSpending > fundAllocation.guiltFreeSpendingCap) {
          const excess = guiltFreeSpending - fundAllocation.guiltFreeSpendingCap
          guiltFreeSpending = fundAllocation.guiltFreeSpendingCap
          excessToSavings += excess
        }
      }

      // Calculate savings based on fund settings
      let savings = 0
      if (fundAllocation.savingsType === "fixed") {
        savings = fundAllocation.savingsValue
      } else {
        savings = (totalIncome * fundAllocation.savingsValue) / 100
      }

      // Check savings cap
      const existingSavings = monthEntries.reduce((sum, entry) => {
        if (fundAllocation.savingsType === "fixed") {
          return sum + fundAllocation.savingsValue
        } else {
          return sum + (entry.amount * fundAllocation.savingsValue) / 100
        }
      }, 0)
      
      if (fundAllocation.savingsCap !== null && fundAllocation.savingsCap !== undefined) {
        const currentMonthTotal = existingSavings + savings
        if (currentMonthTotal > fundAllocation.savingsCap) {
          const excess = savings - Math.max(0, fundAllocation.savingsCap - existingSavings)
          savings = Math.max(0, fundAllocation.savingsCap - existingSavings)
          excessToSavings += excess
        }
      }

      // Add excess from capped categories to savings
      savings += excessToSavings

      // Calculate total allocated
      const allocated = fixedCosts + investment + guiltFreeSpending + savings
      const unallocated = totalIncome - allocated

      // Ensure all money is allocated - add any unallocated amount to savings
      // This ensures total always equals income exactly (no more, no less)
      if (unallocated !== 0) {
        savings += unallocated
      }

      // Ensure total exactly equals income (handle any rounding differences)
      const totalCalculated = fixedCosts + savings + investment + guiltFreeSpending
      const roundingDifference = totalIncome - totalCalculated
      savings += roundingDifference

      const breakdown = {
        income: totalIncomeIncludingCash, // Include cash income in total for display
        fixedCosts: Math.round(fixedCosts * 100) / 100,
        savings: Math.round(savings * 100) / 100,
        investment: Math.round(investment * 100) / 100,
        guiltFreeSpending: Math.round(guiltFreeSpending * 100) / 100,
        total: totalIncome, // Total allocated (excludes cash income - cash is not allocated)
      }

      return NextResponse.json({ breakdown, entries: monthEntries, period: "currentMonth" })
    }

    if (latest) {
      const latestEntry = await prisma.incomeEntry.findFirst({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
      })

      if (!latestEntry) {
        return NextResponse.json({ breakdown: null })
      }

      // Get fund allocation to recalculate breakdown
      const fundAllocation = await prisma.fundAllocation.findUnique({
        where: { userId: session.user.id }
      })

      if (!fundAllocation) {
        return NextResponse.json({ breakdown: null })
      }

      // Recalculate breakdown (same logic as calculate route)
      const income = latestEntry.amount
      let fixedCosts = 0
      let savings = 0
      let investment = 0
      let guiltFreeSpending = 0

      if (fundAllocation.fixedCostsType === "fixed") {
        fixedCosts = Math.min(fundAllocation.fixedCostsValue, income)
      } else {
        fixedCosts = (income * fundAllocation.fixedCostsValue) / 100
      }

      if (fundAllocation.investmentType === "fixed") {
        investment = Math.min(fundAllocation.investmentValue, income)
      } else {
        investment = (income * fundAllocation.investmentValue) / 100
      }

      if (fundAllocation.guiltFreeSpendingType === "fixed") {
        guiltFreeSpending = Math.min(fundAllocation.guiltFreeSpendingValue, income)
      } else {
        guiltFreeSpending = (income * fundAllocation.guiltFreeSpendingValue) / 100
      }

      // Calculate savings based on fund settings
      if (fundAllocation.savingsType === "fixed") {
        savings = fundAllocation.savingsValue
      } else {
        savings = (income * fundAllocation.savingsValue) / 100
      }

      // Calculate total and ensure all money is allocated
      const allocated = fixedCosts + investment + guiltFreeSpending + savings
      const unallocated = income - allocated

      // Ensure all money is allocated - add any unallocated amount to savings
      // This ensures total always equals income exactly (no more, no less)
      if (unallocated !== 0) {
        savings += unallocated
      }

      // Handle any rounding differences to ensure total exactly equals income
      const totalCalculated = fixedCosts + savings + investment + guiltFreeSpending
      const roundingDifference = income - totalCalculated
      savings += roundingDifference

      const breakdown = {
        income,
        fixedCosts: Math.round(fixedCosts * 100) / 100,
        savings: Math.round(savings * 100) / 100,
        investment: Math.round(investment * 100) / 100,
        guiltFreeSpending: Math.round(guiltFreeSpending * 100) / 100,
        total: income, // Total always equals income exactly
      }

      // Get all month entries for the response
      const allMonthEntries = await getCurrentMonthIncomeEntries(session.user.id)
      return NextResponse.json({ breakdown, entry: latestEntry, entries: allMonthEntries })
    }

    const entries = await prisma.incomeEntry.findMany({
      where: { userId: session.user.id },
      include: {
        account: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return NextResponse.json({ entries })
  } catch (error) {
    console.error("Error fetching income entries:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Delete all income entries and reset category balances for the user
    const [incomeResult, balanceResult] = await Promise.all([
      prisma.incomeEntry.deleteMany({
        where: { userId: session.user.id }
      }),
      prisma.categoryBalance.deleteMany({
        where: { userId: session.user.id }
      })
    ])

    return NextResponse.json({ 
      message: "Income data reset successfully",
      deletedIncomeCount: incomeResult.count,
      deletedBalanceCount: balanceResult.count
    })
  } catch (error) {
    console.error("Error deleting income entries:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
