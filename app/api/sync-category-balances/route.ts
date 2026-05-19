import { NextResponse } from "next/server"
import { moneyJsonResponse } from "@/lib/api-money-response"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getCurrentMonthYear, getIncomeEntriesForMonthByDate } from "@/lib/monthly-tracking"
import {
  computeIncomeAllocationsMinor,
  type CategoryKey,
  type IncomeAllocationMinor,
} from "@/lib/income-allocation"
import { serializeMoneyForApi } from "@/lib/money-api"
import { currencyFromSession } from "@/lib/user-currency"
import { addMinor, coerceMinor } from "@/lib/money"

/**
 * Recalculate and sync CategoryBalance with actual allocations from income entries
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

    const currency = currencyFromSession(session.user.displayCurrency)

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
    const existingMonthEntries = await getIncomeEntriesForMonthByDate(session.user.id)
    const monthEntries = existingMonthEntries.filter(
      (entry) => entry.excludeFromAllocation !== true,
    )

    let totals: IncomeAllocationMinor = {
      fixedCosts: 0n,
      savings: 0n,
      investment: 0n,
      guiltFreeSpending: 0n,
    }
    const allocatedSoFar: Record<CategoryKey, bigint> = {
      fixedCosts: 0n,
      savings: 0n,
      investment: 0n,
      guiltFreeSpending: 0n,
    }

    for (const entry of monthEntries) {
      const incomeMinor = coerceMinor(entry.amount)
      const alloc = computeIncomeAllocationsMinor(
        incomeMinor,
        fundAllocation,
        currency,
        (cat) => allocatedSoFar[cat],
      )
      totals.fixedCosts = addMinor(totals.fixedCosts, alloc.fixedCosts)
      totals.savings = addMinor(totals.savings, alloc.savings)
      totals.investment = addMinor(totals.investment, alloc.investment)
      totals.guiltFreeSpending = addMinor(
        totals.guiltFreeSpending,
        alloc.guiltFreeSpending,
      )
      allocatedSoFar.fixedCosts = addMinor(allocatedSoFar.fixedCosts, alloc.fixedCosts)
      allocatedSoFar.savings = addMinor(allocatedSoFar.savings, alloc.savings)
      allocatedSoFar.investment = addMinor(allocatedSoFar.investment, alloc.investment)
      allocatedSoFar.guiltFreeSpending = addMinor(
        allocatedSoFar.guiltFreeSpending,
        alloc.guiltFreeSpending,
      )
    }

    const categories = [
      { name: "fixedCosts", balance: totals.fixedCosts },
      { name: "investment", balance: totals.investment },
      { name: "guiltFreeSpending", balance: totals.guiltFreeSpending },
      { name: "savings", balance: totals.savings },
    ]

    const existingBalances = await prisma.categoryBalance.findMany({
      where: {
        userId: session.user.id,
        month: currentMonth,
        year: currentYear,
      },
    })

    const existingMap = new Map(existingBalances.map(b => [b.category, b]))

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

    return moneyJsonResponse(
      {
        message: "Category balances synced successfully",
        balances: categories.map((c) => ({
          name: c.name,
          balance: serializeMoneyForApi(c.balance, currency),
        })),
      },
      currency
    )
  } catch (error) {
    console.error("Error syncing category balances:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
