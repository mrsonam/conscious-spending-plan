import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getCurrentMonthYear } from "@/lib/monthly-tracking"

/**
 * Get category tracking summary including:
 * - Current month allocation
 * - Spent amount
 * - Remaining balance
 * - Carryover from previous month
 * - Overspending deduction from next month
 */
export async function GET(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { month: currentMonth, year: currentYear, startOfMonth, endOfMonth } = getCurrentMonthYear()
    
    // Parallelize all data fetching.
    // IMPORTANT: We treat CategoryBalance as the canonical source of how much
    // has been allocated per category. This means changing fund settings
    // will NOT retroactively change past allocations – only new income entries
    // (handled in /api/calculate) update these balances.
    const [
      currentMonthCategoryBalances,
      currentMonthExpenses,
      currentMonthTransfers,
      currentMonthInvestments,
    ] = await Promise.all([
      // Current month category balances (allocated amounts per category)
      prisma.categoryBalance.findMany({
        where: {
          userId: session.user.id,
          month: currentMonth,
          year: currentYear,
        },
      }),
      // Get current month expenses (only amount and category needed)
      prisma.expense.findMany({
        where: {
          userId: session.user.id,
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
          category: {
            in: ["fixedCosts", "investment", "savings", "guiltFreeSpending"],
          },
        },
        select: {
          amount: true,
          category: true,
        },
      }),
      // Get current month transfers (only amount and category needed)
      prisma.transfer.findMany({
        where: {
          userId: session.user.id,
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
          category: {
            in: ["fixedCosts", "investment", "savings", "guiltFreeSpending"],
          },
        },
        select: {
          amount: true,
          category: true,
        },
      }),
      // Get current month investment holdings (investments count as "spent" in investment category)
      prisma.investmentHolding.findMany({
        where: {
          userId: session.user.id,
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        select: {
          amount: true,
        },
      }),
    ])

    // Expenses and transfers already fetched above in parallel

    // Calculate spent per category from expenses and transfers
    const categoryStats: Record<string, { allocated: number; spent: number; transferred: number; income: number }> = {
      fixedCosts: { allocated: 0, spent: 0, transferred: 0, income: 0 },
      investment: { allocated: 0, spent: 0, transferred: 0, income: 0 },
      guiltFreeSpending: { allocated: 0, spent: 0, transferred: 0, income: 0 },
      savings: { allocated: 0, spent: 0, transferred: 0, income: 0 },
    }

    // Fill allocated from current month CategoryBalance (canonical allocations)
    for (const balance of currentMonthCategoryBalances) {
      if (categoryStats[balance.category]) {
        categoryStats[balance.category].allocated += balance.balance || 0
      }
    }

    for (const expense of currentMonthExpenses) {
      if (expense.category && categoryStats[expense.category]) {
        // For investment category, don't count expenses as "spent" - only investment holdings count
        // Expenses with category "investment" might be old data from before we changed the logic
        if (expense.category !== "investment") {
          categoryStats[expense.category].spent += expense.amount
        }
      }
    }

    for (const transfer of currentMonthTransfers) {
      if (transfer.category && categoryStats[transfer.category]) {
        // Transfers are tracked separately and don't count as "spent" for investment category
        categoryStats[transfer.category].transferred += transfer.amount
      }
    }

    // Add investment holdings to investment category "spent" (investments are assets, but count as spending from allocation)
    // Only investment holdings count as "spent" for investment category, not expenses or transfers
    for (const investment of currentMonthInvestments) {
      categoryStats.investment.spent += investment.amount
    }

    // Get previous month's carryover (surplus)
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear

    const prevMonthStart = new Date(prevYear, prevMonth - 1, 1)
    const prevMonthEnd = new Date(currentYear, currentMonth - 1, 1)

    // Parallelize previous month queries
    const [prevMonthExpenses, prevMonthCategoryBalances, prevMonthInvestments] = await Promise.all([
      prisma.expense.findMany({
        where: {
          userId: session.user.id,
          date: {
            gte: prevMonthStart,
            lt: prevMonthEnd,
          },
          category: {
            in: ["fixedCosts", "investment", "savings", "guiltFreeSpending"],
          },
        },
        select: {
          amount: true,
          category: true,
        },
      }),
      // Previous month category balances (what was actually allocated per category)
      prisma.categoryBalance.findMany({
        where: {
          userId: session.user.id,
          month: prevMonth,
          year: prevYear,
        },
      }),
      // Get previous month investment holdings
      prisma.investmentHolding.findMany({
        where: {
          userId: session.user.id,
          date: {
            gte: prevMonthStart,
            lt: prevMonthEnd,
          },
        },
        select: {
          amount: true,
        },
      }),
    ])

    // Calculate carryover and overspending
    const categories = ["fixedCosts", "investment", "guiltFreeSpending", "savings"]
    const tracking: Record<string, any> = {}

    for (const cat of categories) {
      // Previous month allocated comes from stored category balances,
      // not from recalculating using the current fund settings.
      let prevAllocated = 0
      for (const bal of prevMonthCategoryBalances) {
        if (bal.category === cat) {
          prevAllocated += bal.balance || 0
        }
      }

      let prevSpent = 0

      // For investment category, don't count expenses as "spent" - only investment holdings count
      if (cat === "investment") {
        // Only count investment holdings for investment category
        for (const investment of prevMonthInvestments) {
          prevSpent += investment.amount
        }
      } else {
        // For other categories, count expenses
        for (const expense of prevMonthExpenses) {
          if (expense.category === cat) {
            prevSpent += expense.amount
          }
        }
      }

      // Calculate net from previous month (allocation - spent)
      // Note: We don't track income separately for categories, only expenses
      const prevNet = prevAllocated - prevSpent
      const carryover = prevNet > 0 ? prevNet : 0
      const overspending = prevNet < 0 ? Math.abs(prevNet) : 0

      const current = categoryStats[cat]
      // Available = current allocation + carryover - overspending deduction
      const available = current.allocated + carryover - overspending
      // Remaining = available - spent - transferred (transfers count as used money)
      // For investment category, transfers don't count against allocation (they're separate)
      const remaining = cat === "investment" 
        ? available - current.spent  // Don't subtract transferred for investments
        : available - current.spent - current.transferred

      tracking[cat] = {
        allocated: Math.round(current.allocated * 100) / 100,
        spent: Math.round(current.spent * 100) / 100,
        transferred: Math.round(current.transferred * 100) / 100,
        income: 0, // Not tracking category-specific income, only expenses
        carryover: Math.round(carryover * 100) / 100,
        overspending: Math.round(overspending * 100) / 100,
        available: Math.round(available * 100) / 100,
        remaining: Math.round(Math.max(0, remaining) * 100) / 100, // Don't show negative, it will be deducted from next month
        overspent: Math.round((remaining < 0 ? Math.abs(remaining) : 0) * 100) / 100,
      }
    }

    return NextResponse.json({ tracking, month: currentMonth, year: currentYear })
  } catch (error) {
    console.error("Error fetching category tracking:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
