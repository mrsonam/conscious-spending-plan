import { NextResponse } from "next/server"
import { moneyJsonResponse } from "@/lib/api-money-response"
import { auth } from "@/lib/auth"
import { ensurePreTrackingSavingsBalances } from "@/lib/pre-tracking-savings"
import { prisma } from "@/lib/prisma"
import { getCurrentMonthYear } from "@/lib/monthly-tracking"
import { serializeMoneyForApi } from "@/lib/money-api"
import { currencyFromSession } from "@/lib/user-currency"
import { coerceMinor } from "@/lib/money"

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

    const currency = currencyFromSession(session.user.displayCurrency)
    const toD = (minor: bigint | null | undefined) =>
      serializeMoneyForApi(coerceMinor(minor ?? 0n), currency)

    await ensurePreTrackingSavingsBalances(session.user.id)

    const { month: currentMonth, year: currentYear } = getCurrentMonthYear()
    
    const months: Array<{ month: number; year: number; label: string }> = []
    for (let i = 0; i < 6; i++) {
      const date = new Date(currentYear, currentMonth - 1 - i, 1)
      const month = date.getMonth() + 1
      const year = date.getFullYear()
      const label = date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
      months.push({ month, year, label })
    }
    months.reverse()

    const oldestMonth = months[0]
    const newestMonth = months[months.length - 1]
    const overallStart = new Date(oldestMonth.year, oldestMonth.month - 1, 1)
    const overallEnd = new Date(newestMonth.year, newestMonth.month, 0, 23, 59, 59, 999)

    const history: Record<string, Array<{ month: string; allocated: number; spent: number; remaining: number }>> = {
      fixedCosts: [],
      investment: [],
      savings: [],
      guiltFreeSpending: [],
    }

    const monthKeys = months.map(m => ({ month: m.month, year: m.year }))

    const oldest = monthKeys[0]
    const prevOfOldest = oldest.month === 1 ? { month: 12, year: oldest.year - 1 } : { month: oldest.month - 1, year: oldest.year }
    const allMonthKeys = [prevOfOldest, ...monthKeys]

    const [allCategoryBalances, allExpenses, allTransfers] = await Promise.all([
      prisma.categoryBalance.findMany({
        where: {
          userId: session.user.id,
          OR: allMonthKeys.map(({ month, year }) => ({ month, year })),
        },
      }),
      prisma.expense.findMany({
        where: {
          userId: session.user.id,
          date: { gte: overallStart, lte: overallEnd },
          category: { in: ["fixedCosts", "investment", "savings", "guiltFreeSpending"] },
        },
        select: { amount: true, category: true, date: true },
      }),
      prisma.transfer.findMany({
        where: {
          userId: session.user.id,
          date: { gte: overallStart, lte: overallEnd },
          category: { in: ["fixedCosts", "investment", "savings", "guiltFreeSpending"] },
        },
        select: { amount: true, category: true, date: true },
      }),
    ])

    const getBalancesForMonth = (month: number, year: number) => {
      const map: Record<string, number> = { fixedCosts: 0, investment: 0, savings: 0, guiltFreeSpending: 0 }
      for (const b of allCategoryBalances) {
        if (b.month === month && b.year === year && map[b.category] !== undefined) {
          map[b.category] = toD(b.balance)
        }
      }
      return map
    }

    const getSpentForMonth = (startOfMonth: Date, endOfMonth: Date) => {
      const spent: Record<string, number> = { fixedCosts: 0, investment: 0, savings: 0, guiltFreeSpending: 0 }
      for (const e of allExpenses) {
        const d = new Date(e.date)
        if (d >= startOfMonth && d <= endOfMonth && e.category && e.category !== "investment") {
          spent[e.category] += toD(e.amount)
        }
      }
      for (const transfer of allTransfers) {
        const d = new Date(transfer.date)
        if (d >= startOfMonth && d <= endOfMonth && transfer.category === "investment") {
          spent.investment += toD(transfer.amount)
        }
      }
      return spent
    }

    let prevBalances = getBalancesForMonth(prevOfOldest.month, prevOfOldest.year)
    let prevSpent = getSpentForMonth(
      new Date(prevOfOldest.year, prevOfOldest.month - 1, 1),
      new Date(prevOfOldest.year, prevOfOldest.month, 0, 23, 59, 59, 999)
    )

    for (const { month, year, label } of months) {
      const startOfMonth = new Date(year, month - 1, 1)
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999)

      const balances = getBalancesForMonth(month, year)
      const spent = getSpentForMonth(startOfMonth, endOfMonth)

      const categories = ["fixedCosts", "investment", "guiltFreeSpending", "savings"] as const
      const allocatedFromIncome: Record<string, number> = {}
      for (const cat of categories) {
        const carryover = Math.max(0, prevBalances[cat] - prevSpent[cat])
        allocatedFromIncome[cat] = Math.max(0, balances[cat] - carryover)
      }

      prevBalances = balances
      prevSpent = spent

      history.fixedCosts.push({
        month: label,
        allocated: Math.round(allocatedFromIncome.fixedCosts * 100) / 100,
        spent: Math.round(spent.fixedCosts * 100) / 100,
        remaining: Math.round((balances.fixedCosts - spent.fixedCosts) * 100) / 100,
      })
      history.investment.push({
        month: label,
        allocated: Math.round(allocatedFromIncome.investment * 100) / 100,
        spent: Math.round(spent.investment * 100) / 100,
        remaining: Math.round((balances.investment - spent.investment) * 100) / 100,
      })
      history.savings.push({
        month: label,
        allocated: Math.round(allocatedFromIncome.savings * 100) / 100,
        spent: Math.round(spent.savings * 100) / 100,
        remaining: Math.round((balances.savings - spent.savings) * 100) / 100,
      })
      history.guiltFreeSpending.push({
        month: label,
        allocated: Math.round(allocatedFromIncome.guiltFreeSpending * 100) / 100,
        spent: Math.round(spent.guiltFreeSpending * 100) / 100,
        remaining: Math.round((balances.guiltFreeSpending - spent.guiltFreeSpending) * 100) / 100,
      })
    }

    return moneyJsonResponse({ history }, currency)
  } catch (error) {
    console.error("Error fetching category history:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
