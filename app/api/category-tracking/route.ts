import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getCurrentMonthYear, getPreviousMonthRemainingAndOverspentByCategory } from "@/lib/monthly-tracking"

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

    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get("month")
    const yearParam = searchParams.get("year")

    let currentMonth: number
    let currentYear: number
    let startOfMonth: Date
    let endOfMonth: Date

    if (monthParam != null && yearParam != null) {
      const m = parseInt(monthParam, 10)
      const y = parseInt(yearParam, 10)
      if (m >= 1 && m <= 12 && y >= 2000 && y <= 2100) {
        currentMonth = m
        currentYear = y
        startOfMonth = new Date(y, m - 1, 1)
        endOfMonth = new Date(y, m, 0, 23, 59, 59, 999)
      } else {
        const def = getCurrentMonthYear()
        currentMonth = def.month
        currentYear = def.year
        startOfMonth = def.startOfMonth
        endOfMonth = def.endOfMonth
      }
    } else {
      const def = getCurrentMonthYear()
      currentMonth = def.month
      currentYear = def.year
      startOfMonth = def.startOfMonth
      endOfMonth = def.endOfMonth
    }
    
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
      incomeEntriesForMonth,
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
      // Get current month investment holdings
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
      // Income for this month (by income date, allocated to budget) – must match sum of allocated from income
      prisma.incomeEntry.findMany({
        where: {
          userId: session.user.id,
          date: { gte: startOfMonth, lte: endOfMonth },
          excludeFromAllocation: false,
        },
        select: { amount: true },
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

    // Single source of truth: previous month remaining (carryover) and overspent from one formula:
    // net = prevAllocated - prevSpent; remaining = max(0, net); overspent = max(0, -net)
    const { remaining: carryoverByCategory, overspent: overspentByCategory } =
      await getPreviousMonthRemainingAndOverspentByCategory(
        session.user.id,
        currentMonth,
        currentYear
      )

    const categories = ["fixedCosts", "investment", "guiltFreeSpending", "savings"]
    const tracking: Record<
      string,
      {
        allocated: number
        spent: number
        transferred: number
        income: number
        carryover: number
        overspending: number
        available: number
        remaining: number
        overspent: number
        overspentFromTransfer: number
      }
    > = {}

    for (const cat of categories) {
      // Explicitly: carryover = previous month's remaining (allocated - spent, when >= 0)
      const carryover = carryoverByCategory[cat] ?? 0
      // Explicitly: overspending = previous month's overspent amount (when spent > allocated)
      const overspending = overspentByCategory[cat] ?? 0

      const current = categoryStats[cat]
      // Available: current month's stored balance (carryover + income allocations) minus overspending deduction.
      const available = current.allocated - overspending
      // Allocated from income this month only (exclude carryover so "total allocate" = from income of the month).
      const allocatedFromIncome = Math.max(0, current.allocated - carryover)
      // Remaining = available - spent - transferred (transfers count as used money)
      // For investment category, transfers don't count against allocation (they're separate)
      const remaining = cat === "investment"
        ? available - current.spent  // Don't subtract transferred for investments
        : available - current.spent - current.transferred

      const overspentTotal = remaining < 0 ? Math.abs(remaining) : 0
      // For non-investment: portion of overspent that is from transfers
      const overspentFromTransfer = cat !== "investment" && overspentTotal > 0
        ? Math.min(current.transferred, overspentTotal)
        : 0

      tracking[cat] = {
        allocated: Math.round(allocatedFromIncome * 100) / 100,
        spent: Math.round(current.spent * 100) / 100,
        transferred: Math.round(current.transferred * 100) / 100,
        income: 0, // Not tracking category-specific income, only expenses
        carryover: Math.round(carryover * 100) / 100,
        overspending: Math.round(overspending * 100) / 100,
        available: Math.round(available * 100) / 100,
        remaining: Math.round(Math.max(0, remaining) * 100) / 100, // Don't show negative, it will be deducted from next month
        overspent: Math.round(overspentTotal * 100) / 100,
        overspentFromTransfer: Math.round(overspentFromTransfer * 100) / 100,
      }
    }

    const totalIncomeForMonth = incomeEntriesForMonth.reduce((sum, e) => sum + e.amount, 0)

    // Ensure sum(allocated) equals totalIncomeForMonth (fix rounding drift by adding difference to savings)
    let sumAllocated = 0
    for (const cat of categories) {
      const t = tracking[cat]
      sumAllocated += t.allocated
    }
    const roundingDiff = Math.round((totalIncomeForMonth - sumAllocated) * 100) / 100
    if (Math.abs(roundingDiff) > 0 && Math.abs(roundingDiff) < 0.05 && tracking.savings) {
      tracking.savings.allocated = Math.round((tracking.savings.allocated + roundingDiff) * 100) / 100
    }

    return NextResponse.json(
      {
        tracking,
        month: currentMonth,
        year: currentYear,
        totalIncomeForMonth: Math.round(totalIncomeForMonth * 100) / 100,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=20, stale-while-revalidate=60",
        },
      },
    )
  } catch (error) {
    console.error("Error fetching category tracking:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
