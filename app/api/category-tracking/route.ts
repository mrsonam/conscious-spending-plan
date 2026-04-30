import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getCurrentMonthYear, getPreviousMonthRemainingAndOverspentByCategory } from "@/lib/monthly-tracking"
import { TRACKING_CATEGORIES, calculateCategoryTracking } from "@/lib/category-tracking-calculation"

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

    // Single source of truth: previous month remaining (carryover) and overspent from one formula:
    // net = prevAllocated - prevSpent; remaining = max(0, net); overspent = max(0, -net)
    const { remaining: carryoverByCategory, overspent: overspentByCategory } =
      await getPreviousMonthRemainingAndOverspentByCategory(
        session.user.id,
        currentMonth,
        currentYear
      )

    const categories = TRACKING_CATEGORIES
    const tracking = calculateCategoryTracking({
      categoryBalances: currentMonthCategoryBalances,
      expenses: currentMonthExpenses,
      transfers: currentMonthTransfers,
      investments: currentMonthInvestments,
      carryoverByCategory,
      overspentByCategory,
    })

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
