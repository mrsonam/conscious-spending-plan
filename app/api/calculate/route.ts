import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { 
  getCurrentMonthYear, 
  ensureMonthlyCategoryBalances, 
  getCurrentMonthIncomeEntries 
} from "@/lib/monthly-tracking"

export async function POST(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { income, description, date, periodStart, periodEnd, accountId, allocateToBudget = true } = await request.json()

    if (!income || income <= 0) {
      return NextResponse.json(
        { error: "Valid income amount is required" },
        { status: 400 }
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

    // Ensure monthly category balances exist (fresh start for new month)
    await ensureMonthlyCategoryBalances(session.user.id)
    
    // Get current month and year for monthly caps
    const { month: currentMonth, year: currentYear, startOfMonth, endOfMonth } = getCurrentMonthYear()

    // Get all income entries for the current month ONLY (to calculate existing allocations)
    // This ensures we only consider income from the current month
    // Exclude cash account entries from budget calculations
    const allMonthEntries = await getCurrentMonthIncomeEntries(session.user.id)
    const existingMonthEntries = allMonthEntries.filter(entry => !(entry as any).excludeFromAllocation)

    // Helper function to calculate allocations for a given income amount
    const calculateAllocations = (incomeAmount: number) => {
      let fc = 0
      let inv = 0
      let gfs = 0
      let sav = 0

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

      if (fundAllocation.savingsType === "fixed") {
        sav = Math.min(fundAllocation.savingsValue, incomeAmount)
      } else {
        sav = (incomeAmount * fundAllocation.savingsValue) / 100
      }

      return { fixedCosts: fc, investment: inv, guiltFreeSpending: gfs, savings: sav }
    }

    // Calculate existing allocations from all current month entries
    // This represents what has already been allocated this month (before caps)
    let existingFixedCosts = 0
    let existingInvestment = 0
    let existingGuiltFreeSpending = 0

    for (const entry of existingMonthEntries) {
      const allocations = calculateAllocations(entry.amount)
      existingFixedCosts += allocations.fixedCosts
      existingInvestment += allocations.investment
      existingGuiltFreeSpending += allocations.guiltFreeSpending
    }

    const updateBalance = async (category: string, amount: number) => {
      // Find existing balance for this month
      const existing = await prisma.categoryBalance.findFirst({
        where: {
          userId: session.user.id,
          category,
          month: currentMonth,
          year: currentYear,
        },
      })

      if (existing) {
        await prisma.categoryBalance.update({
          where: { id: existing.id },
          data: {
            balance: { increment: amount },
          },
        })
      } else {
        await prisma.categoryBalance.create({
          data: {
            userId: session.user.id,
            category,
            balance: amount,
            month: currentMonth,
            year: currentYear,
          },
        })
      }
    }

    // Calculate allocations strictly according to fund settings
    // All money will be allocated - no "remaining" logic
    let fixedCosts = 0
    let savings = 0
    let investment = 0
    let guiltFreeSpending = 0

    // Calculate each category based on its allocation type
    if (fundAllocation.fixedCostsType === "fixed") {
      fixedCosts = fundAllocation.fixedCostsValue
    } else {
      fixedCosts = (income * fundAllocation.fixedCostsValue) / 100
    }

    if (fundAllocation.investmentType === "fixed") {
      investment = fundAllocation.investmentValue
    } else {
      investment = (income * fundAllocation.investmentValue) / 100
    }

    if (fundAllocation.guiltFreeSpendingType === "fixed") {
      guiltFreeSpending = fundAllocation.guiltFreeSpendingValue
    } else {
      guiltFreeSpending = (income * fundAllocation.guiltFreeSpendingValue) / 100
    }

    if (fundAllocation.savingsType === "fixed") {
      savings = fundAllocation.savingsValue
    } else {
      savings = (income * fundAllocation.savingsValue) / 100
    }

    // Check caps and adjust allocations based on existing month allocations + new allocations
    // Excess from capped categories is redistributed proportionally to other categories
    let excessToRedistribute = 0

    // Check fixed costs cap
    if (fundAllocation.fixedCostsCap !== null && fundAllocation.fixedCostsCap !== undefined) {
      const currentMonthTotal = existingFixedCosts + fixedCosts
      if (currentMonthTotal > fundAllocation.fixedCostsCap) {
        const remainingCap = Math.max(0, fundAllocation.fixedCostsCap - existingFixedCosts)
        const excess = fixedCosts - remainingCap
        fixedCosts = remainingCap
        excessToRedistribute += excess
      }
    }

    // Check investment cap
    if (fundAllocation.investmentCap !== null && fundAllocation.investmentCap !== undefined) {
      const currentMonthTotal = existingInvestment + investment
      if (currentMonthTotal > fundAllocation.investmentCap) {
        const remainingCap = Math.max(0, fundAllocation.investmentCap - existingInvestment)
        const excess = investment - remainingCap
        investment = remainingCap
        excessToRedistribute += excess
      }
    }

    // Check guilt-free spending cap
    if (fundAllocation.guiltFreeSpendingCap !== null && fundAllocation.guiltFreeSpendingCap !== undefined) {
      const currentMonthTotal = existingGuiltFreeSpending + guiltFreeSpending
      if (currentMonthTotal > fundAllocation.guiltFreeSpendingCap) {
        const remainingCap = Math.max(0, fundAllocation.guiltFreeSpendingCap - existingGuiltFreeSpending)
        const excess = guiltFreeSpending - remainingCap
        guiltFreeSpending = remainingCap
        excessToRedistribute += excess
      }
    }

    // Check savings cap
    const existingSavings = existingMonthEntries.reduce((sum, entry) => {
      if (fundAllocation.savingsType === "fixed") {
        return sum + fundAllocation.savingsValue
      } else {
        return sum + (entry.amount * fundAllocation.savingsValue) / 100
      }
    }, 0)
    
    if (fundAllocation.savingsCap !== null && fundAllocation.savingsCap !== undefined) {
      const currentMonthTotal = existingSavings + savings
      if (currentMonthTotal > fundAllocation.savingsCap) {
        const remainingCap = Math.max(0, fundAllocation.savingsCap - existingSavings)
        const excess = savings - remainingCap
        savings = remainingCap
        excessToRedistribute += excess
      }
    }

    // Add excess from capped categories to savings
    savings += excessToRedistribute

    // Calculate total allocated so far
    const allocated = fixedCosts + investment + guiltFreeSpending + savings
    const unallocated = income - allocated

    // Ensure all money is allocated - add any unallocated amount to savings
    // This ensures total always equals income exactly (no more, no less)
    if (unallocated !== 0) {
      savings += unallocated
    }

    // Get the account to deposit to (either selected account or default account)
    let depositAccount = null
    if (accountId) {
      // Verify the account belongs to the user
      depositAccount = await prisma.account.findFirst({
        where: {
          id: accountId,
          userId: session.user.id,
        },
      })
    } else {
      // Fall back to default account if no account selected
      depositAccount = await prisma.account.findFirst({
        where: {
          userId: session.user.id,
          isDefault: true,
        },
      })
    }

    // Save income entry first (with accountId if available)
    const incomeEntry = await prisma.incomeEntry.create({
      data: {
        userId: session.user.id,
        amount: income,
        description: description || null,
        date: date ? new Date(date) : new Date(), // Use provided date or current date
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        accountId: depositAccount?.id || null,
        // Casting to any to avoid Prisma client type mismatch until generate is run
        excludeFromAllocation: !allocateToBudget,
      } as any,
    })

    // If this income should not be allocated to budget categories, just deposit and return
    if (!allocateToBudget) {
      if (depositAccount) {
        await prisma.account.update({
          where: { id: depositAccount.id },
          data: {
            balance: { increment: income },
          },
        })
      }

      return NextResponse.json({
        income,
        fixedCosts: 0,
        savings: 0,
        investment: 0,
        guiltFreeSpending: 0,
        total: income,
        incomeEntryId: incomeEntry.id,
        depositedToAccount: depositAccount?.id || null,
        depositedToAccountName: depositAccount ? `${depositAccount.name} (${depositAccount.bankName})` : null,
        isCashAccount: depositAccount?.accountType === "cash",
      })
    }

    // Recalculate ALL category balances from scratch (all income entries including the new one)
    // This ensures the stored balances match the actual calculated allocations with caps applied
    // Exclude cash account entries from budget calculations
    // Fetch fresh data that includes the newly created income entry
    const allMonthEntriesForRecalc = await getCurrentMonthIncomeEntries(session.user.id)
    const monthEntriesForRecalc = allMonthEntriesForRecalc.filter(entry => !(entry as any).excludeFromAllocation)
    
    // Recalculate totals from all entries (excluding cash accounts)
    let recalcFixedCosts = 0
    let recalcInvestment = 0
    let recalcGuiltFreeSpending = 0
    let recalcSavings = 0
    
    for (const entry of monthEntriesForRecalc) {
      const allocations = calculateAllocations(entry.amount)
      recalcFixedCosts += allocations.fixedCosts || 0
      recalcInvestment += allocations.investment || 0
      recalcGuiltFreeSpending += allocations.guiltFreeSpending || 0
      recalcSavings += allocations.savings || 0
    }
    
    // Ensure all values are numbers (handle any NaN or undefined)
    recalcFixedCosts = isNaN(recalcFixedCosts) ? 0 : recalcFixedCosts
    recalcInvestment = isNaN(recalcInvestment) ? 0 : recalcInvestment
    recalcGuiltFreeSpending = isNaN(recalcGuiltFreeSpending) ? 0 : recalcGuiltFreeSpending
    recalcSavings = isNaN(recalcSavings) ? 0 : recalcSavings
    
    // Apply caps to recalculated totals
    let recalcExcessToSavings = 0
    
    if (fundAllocation.fixedCostsCap !== null && fundAllocation.fixedCostsCap !== undefined) {
      if (recalcFixedCosts > fundAllocation.fixedCostsCap) {
        const excess = recalcFixedCosts - fundAllocation.fixedCostsCap
        recalcFixedCosts = fundAllocation.fixedCostsCap
        recalcExcessToSavings += excess
      }
    }
    
    if (fundAllocation.investmentCap !== null && fundAllocation.investmentCap !== undefined) {
      if (recalcInvestment > fundAllocation.investmentCap) {
        const excess = recalcInvestment - fundAllocation.investmentCap
        recalcInvestment = fundAllocation.investmentCap
        recalcExcessToSavings += excess
      }
    }
    
    if (fundAllocation.guiltFreeSpendingCap !== null && fundAllocation.guiltFreeSpendingCap !== undefined) {
      if (recalcGuiltFreeSpending > fundAllocation.guiltFreeSpendingCap) {
        const excess = recalcGuiltFreeSpending - fundAllocation.guiltFreeSpendingCap
        recalcGuiltFreeSpending = fundAllocation.guiltFreeSpendingCap
        recalcExcessToSavings += excess
      }
    }
    
    if (fundAllocation.savingsCap !== null && fundAllocation.savingsCap !== undefined) {
      if (recalcSavings + recalcExcessToSavings > fundAllocation.savingsCap) {
        recalcSavings = fundAllocation.savingsCap
        // Excess beyond savings cap stays in savings (no other place)
      } else {
        recalcSavings += recalcExcessToSavings
      }
    } else {
      recalcSavings += recalcExcessToSavings
    }
    
    // Set category balances to recalculated values (not increment - this ensures accuracy)
    const setBalance = async (category: string, amount: number) => {
      // Ensure amount is a valid number
      const balanceValue = isNaN(amount) || amount === undefined || amount === null ? 0 : amount
      
      const existing = await prisma.categoryBalance.findFirst({
        where: {
          userId: session.user.id,
          category,
          month: currentMonth,
          year: currentYear,
        },
      })

      if (existing) {
        await prisma.categoryBalance.update({
          where: { id: existing.id },
          data: { balance: balanceValue },
        })
      } else {
        await prisma.categoryBalance.create({
          data: {
            userId: session.user.id,
            category,
            balance: balanceValue,
            month: currentMonth,
            year: currentYear,
          },
        })
      }
    }
    
    // Ensure all values are numbers before calling setBalance
    await Promise.all([
      setBalance("fixedCosts", recalcFixedCosts ?? 0),
      setBalance("investment", recalcInvestment ?? 0),
      setBalance("guiltFreeSpending", recalcGuiltFreeSpending ?? 0),
      setBalance("savings", recalcSavings ?? 0),
    ])

    // Deposit income to selected/default account if it exists
    if (depositAccount) {
      await prisma.account.update({
        where: { id: depositAccount.id },
        data: {
          balance: { increment: income },
        },
      })
    } else if (!accountId) {
      console.warn("No default account set for user. Income not deposited to any account.")
    }

    // Ensure total exactly equals income (handle any rounding differences)
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
      incomeEntryId: incomeEntry.id,
      depositedToAccount: depositAccount?.id || null,
      depositedToAccountName: depositAccount ? `${depositAccount.name} (${depositAccount.bankName})` : null,
    }

    return NextResponse.json(breakdown)
  } catch (error) {
    console.error("Error calculating breakdown:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
