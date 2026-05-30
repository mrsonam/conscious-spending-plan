import { NextResponse } from "next/server"
import { moneyJsonResponse } from "@/lib/api-money-response"
import { auth } from "@/lib/auth"
import { ensurePreTrackingSavingsBalances } from "@/lib/pre-tracking-savings"
import { prisma } from "@/lib/prisma"
import { getCurrentMonthYear, getIncomeEntriesForMonthByDate, getPreviousMonthRemainingAndOverspentByCategory } from "@/lib/monthly-tracking"
import { TRACKING_CATEGORIES, calculateCategoryTracking } from "@/lib/category-tracking-calculation"
import { buildAllocatedSoFarFromEntries } from "@/lib/income-allocation"
import { reconcilePlanToLiquid } from "@/lib/plan-liquid-reconcile"
import { loadGeneralSavingsContext } from "@/lib/saving-goal-general-savings"
import { serializeMoneyForApi } from "@/lib/money-api"
import { minorSumToDollars } from "@/lib/money-aggregates"
import { currencyFromSession } from "@/lib/user-currency"
import { addMinor, coerceMinor } from "@/lib/money"

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

    const currency = currencyFromSession(session.user.displayCurrency)
    const toD = (minor: bigint) => serializeMoneyForApi(minor, currency)

    await ensurePreTrackingSavingsBalances(session.user.id)

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
    
    const [
      currentMonthCategoryBalances,
      currentMonthExpenses,
      currentMonthTransfers,
      currentMonthInvestments,
      incomeEntriesForMonth,
      fundAllocation,
    ] = await Promise.all([
      prisma.categoryBalance.findMany({
        where: {
          userId: session.user.id,
          month: currentMonth,
          year: currentYear,
        },
      }),
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
      prisma.incomeEntry.findMany({
        where: {
          userId: session.user.id,
          date: { gte: startOfMonth, lte: endOfMonth },
          excludeFromAllocation: false,
        },
        select: {
          amount: true,
          excludeFromAllocation: true,
          allocationFixedCosts: true,
          allocationSavings: true,
          allocationInvestment: true,
          allocationGuiltFreeSpending: true,
        },
      }),
      prisma.fundAllocation.findUnique({
        where: { userId: session.user.id },
      }),
    ])

    const { remaining: carryoverByCategory, overspent: overspentByCategory } =
      await getPreviousMonthRemainingAndOverspentByCategory(
        session.user.id,
        currentMonth,
        currentYear
      )

    const incomeAllocatedMinor = fundAllocation
      ? buildAllocatedSoFarFromEntries(
          incomeEntriesForMonth,
          fundAllocation,
          currency,
        )
      : null
    const incomeAllocatedByCategory: Record<string, number> = {}
    if (incomeAllocatedMinor) {
      for (const cat of TRACKING_CATEGORIES) {
        incomeAllocatedByCategory[cat] = toD(incomeAllocatedMinor[cat])
      }
    }

    let tracking = calculateCategoryTracking({
      categoryBalances: currentMonthCategoryBalances.map((b) => ({
        category: b.category,
        balance: toD(b.balance ?? 0n),
      })),
      expenses: currentMonthExpenses.map((e) => ({
        category: e.category,
        amount: toD(e.amount),
      })),
      transfers: currentMonthTransfers.map((t) => ({
        category: t.category,
        amount: toD(t.amount),
      })),
      investments: currentMonthInvestments.map((i) => ({
        amount: toD(i.amount),
      })),
      carryoverByCategory,
      overspentByCategory,
      incomeAllocatedByCategory: incomeAllocatedMinor
        ? incomeAllocatedByCategory
        : undefined,
    })

    const planVsLiquid = await reconcilePlanToLiquid(
      session.user.id,
      currentMonth,
      currentYear,
      currency,
      tracking
    )
    tracking = planVsLiquid.tracking

    const savingsCtx = await loadGeneralSavingsContext(
      prisma,
      session.user.id,
      currentMonth,
      currentYear
    )

    const totalIncomeMinor = incomeEntriesForMonth.reduce(
      (sum, e) => addMinor(sum, coerceMinor(e.amount)),
      0n,
    )
    const totalIncomeForMonth = minorSumToDollars(totalIncomeMinor, currency)

    let sumAllocated = 0
    for (const cat of TRACKING_CATEGORIES) {
      sumAllocated += tracking[cat].allocated
    }
    const roundingDiff = Math.round((totalIncomeForMonth - sumAllocated) * 100) / 100
    if (Math.abs(roundingDiff) > 0 && Math.abs(roundingDiff) < 0.05 && tracking.savings) {
      tracking.savings.allocated = Math.round((tracking.savings.allocated + roundingDiff) * 100) / 100
    }

    return moneyJsonResponse(
      {
        tracking,
        month: currentMonth,
        year: currentYear,
        totalIncomeForMonth: Math.round(totalIncomeForMonth * 100) / 100,
        savingsGeneralAvailable: toD(savingsCtx.availableMinor),
        planVsLiquid: {
          liquidTotal: planVsLiquid.liquidTotal,
          deployable: planVsLiquid.deployable,
          gap: planVsLiquid.gap,
          adjusted: planVsLiquid.adjusted,
        },
      },
      currency,
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
