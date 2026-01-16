import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getCurrentMonthYear, getCurrentMonthIncomeEntries } from "@/lib/monthly-tracking"

/**
 * Recalculate and sync CategoryBalance with actual allocations from income entries
 * This ensures the displayed balances match the actual calculated allocations
 */
export async function POST() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const fundAllocation = await prisma.fundAllocation.findUnique({
      where: { userId: session.user.id }
    })

    if (!fundAllocation) {
      return NextResponse.json(
        { error: "Fund allocation not found" },
        { status: 404 }
      )
    }

    const { month: currentMonth, year: currentYear } = getCurrentMonthYear()
    const existingMonthEntries = await getCurrentMonthIncomeEntries(session.user.id)

    // Helper function to calculate allocations for a given income amount
    const calculateAllocations = (incomeAmount: number) => {
      let fc = 0
      let inv = 0
      let gfs = 0
      let sav = 0

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

    // Calculate total allocations for each category from all income entries
    let totalFixedCosts = 0
    let totalInvestment = 0
    let totalGuiltFreeSpending = 0
    let totalSavings = 0

    for (const entry of existingMonthEntries) {
      const allocations = calculateAllocations(entry.amount)
      totalFixedCosts += allocations.fixedCosts
      totalInvestment += allocations.investment
      totalGuiltFreeSpending += allocations.guiltFreeSpending
      totalSavings += allocations.savings
    }

    // Apply caps
    let excessToSavings = 0

    if (fundAllocation.fixedCostsCap !== null && fundAllocation.fixedCostsCap !== undefined) {
      if (totalFixedCosts > fundAllocation.fixedCostsCap) {
        const excess = totalFixedCosts - fundAllocation.fixedCostsCap
        totalFixedCosts = fundAllocation.fixedCostsCap
        excessToSavings += excess
      }
    }

    if (fundAllocation.investmentCap !== null && fundAllocation.investmentCap !== undefined) {
      if (totalInvestment > fundAllocation.investmentCap) {
        const excess = totalInvestment - fundAllocation.investmentCap
        totalInvestment = fundAllocation.investmentCap
        excessToSavings += excess
      }
    }

    if (fundAllocation.guiltFreeSpendingCap !== null && fundAllocation.guiltFreeSpendingCap !== undefined) {
      if (totalGuiltFreeSpending > fundAllocation.guiltFreeSpendingCap) {
        const excess = totalGuiltFreeSpending - fundAllocation.guiltFreeSpendingCap
        totalGuiltFreeSpending = fundAllocation.guiltFreeSpendingCap
        excessToSavings += excess
      }
    }

    if (fundAllocation.savingsCap !== null && fundAllocation.savingsCap !== undefined) {
      if (totalSavings + excessToSavings > fundAllocation.savingsCap) {
        const excess = (totalSavings + excessToSavings) - fundAllocation.savingsCap
        totalSavings = fundAllocation.savingsCap
        excessToSavings = excess
      } else {
        totalSavings += excessToSavings
      }
    } else {
      totalSavings += excessToSavings
    }

    // Update or create CategoryBalance records with the recalculated values
    // Use batch operations for better performance
    const categories = [
      { name: "fixedCosts", balance: totalFixedCosts },
      { name: "investment", balance: totalInvestment },
      { name: "guiltFreeSpending", balance: totalGuiltFreeSpending },
      { name: "savings", balance: totalSavings },
    ]

    // Fetch all existing balances in one query
    const existingBalances = await prisma.categoryBalance.findMany({
      where: {
        userId: session.user.id,
        month: currentMonth,
        year: currentYear,
      },
    })

    const existingMap = new Map(existingBalances.map(b => [b.category, b]))

    // Batch all operations
    const operations = categories.map(cat => {
      const existing = existingMap.get(cat.name)
      if (existing) {
        return prisma.categoryBalance.update({
          where: { id: existing.id },
          data: { balance: cat.balance },
        })
      } else {
        return prisma.categoryBalance.create({
          data: {
            userId: session.user.id,
            category: cat.name,
            balance: cat.balance,
            month: currentMonth,
            year: currentYear,
          },
        })
      }
    })

    await Promise.all(operations)

    return NextResponse.json({ 
      message: "Category balances synced successfully",
      balances: categories
    })
  } catch (error) {
    console.error("Error syncing category balances:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
