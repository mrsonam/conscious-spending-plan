import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { currencyFromSession } from "@/lib/user-currency"
import { serializeMoneyForApi } from "@/lib/money-api"
import { coerceMinor } from "@/lib/money"

const CATEGORIES = ["fixedCosts", "savings", "investment", "guiltFreeSpending"] as const

function monthKey(month: number, year: number) {
  return `${year}-${String(month).padStart(2, "0")}`
}

function monthLabel(month: number, year: number) {
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  })
}

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const monthsBack = Math.min(Math.max(parseInt(searchParams.get("months") ?? "12", 10), 3), 24)

    const currency = currencyFromSession(session.user.displayCurrency)
    const toD = (minor: bigint) => serializeMoneyForApi(minor, currency)

    // Build month buckets from oldest → current
    const now = new Date()
    const buckets: { month: number; year: number; key: string; label: string }[] = []
    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const month = d.getMonth() + 1
      const year = d.getFullYear()
      buckets.push({ month, year, key: monthKey(month, year), label: monthLabel(month, year) })
    }

    const rangeStart = new Date(buckets[0].year, buckets[0].month - 1, 1)
    const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    const [expenses, incomeEntries] = await Promise.all([
      prisma.expense.findMany({
        where: {
          userId: session.user.id,
          date: { gte: rangeStart, lte: rangeEnd },
        },
        select: { amount: true, category: true, expenseCategory: true, date: true },
      }),
      prisma.incomeEntry.findMany({
        where: {
          userId: session.user.id,
          date: { gte: rangeStart, lte: rangeEnd },
          excludeFromAllocation: false,
        },
        select: {
          amount: true,
          date: true,
          description: true,
          allocationFixedCosts: true,
          allocationSavings: true,
          allocationInvestment: true,
          allocationGuiltFreeSpending: true,
        },
      }),
    ])

    // Aggregate spend per month+category (pillars), plus granular
    // expenseCategory totals per month for category trend views.
    const spendMap = new Map<string, Record<string, bigint>>()
    const granularMap = new Map<string, Map<string, bigint>>()
    const granularTotals = new Map<string, bigint>()
    for (const { month, year, key } of buckets) {
      void month; void year
      spendMap.set(key, { fixedCosts: 0n, savings: 0n, investment: 0n, guiltFreeSpending: 0n })
      granularMap.set(key, new Map())
    }
    for (const e of expenses) {
      const m = e.date.getMonth() + 1
      const y = e.date.getFullYear()
      const key = monthKey(m, y)
      const amount = coerceMinor(e.amount)

      const bucket = spendMap.get(key)
      if (bucket && e.category && (CATEGORIES as readonly string[]).includes(e.category)) {
        bucket[e.category] = (bucket[e.category] ?? 0n) + amount
      }

      const granular = granularMap.get(key)
      if (granular) {
        const cat = e.expenseCategory || "uncategorised"
        granular.set(cat, (granular.get(cat) ?? 0n) + amount)
        granularTotals.set(cat, (granularTotals.get(cat) ?? 0n) + amount)
      }
    }

    // Top categories across the whole range; the rest folds into "other".
    const topCategoryKeys = [...granularTotals.entries()]
      .sort((a, b) => (b[1] > a[1] ? 1 : b[1] < a[1] ? -1 : 0))
      .slice(0, 8)
      .map(([cat]) => cat)

    // Aggregate income + allocations per month
    const incomeMap = new Map<string, { income: bigint; fixedCosts: bigint; savings: bigint; investment: bigint; guiltFreeSpending: bigint }>()
    for (const { key } of buckets) {
      incomeMap.set(key, { income: 0n, fixedCosts: 0n, savings: 0n, investment: 0n, guiltFreeSpending: 0n })
    }
    const incomeSourceTotals = new Map<string, bigint>()
    for (const e of incomeEntries) {
      const m = e.date.getMonth() + 1
      const y = e.date.getFullYear()
      const key = monthKey(m, y)
      const bucket = incomeMap.get(key)
      if (!bucket) continue
      bucket.income += coerceMinor(e.amount)
      bucket.fixedCosts += coerceMinor(e.allocationFixedCosts ?? 0n)
      bucket.savings += coerceMinor(e.allocationSavings ?? 0n)
      bucket.investment += coerceMinor(e.allocationInvestment ?? 0n)
      bucket.guiltFreeSpending += coerceMinor(e.allocationGuiltFreeSpending ?? 0n)

      const label = e.description?.trim() || "Other income"
      incomeSourceTotals.set(label, (incomeSourceTotals.get(label) ?? 0n) + coerceMinor(e.amount))
    }

    const sortedSources = [...incomeSourceTotals.entries()].sort((a, b) =>
      b[1] > a[1] ? 1 : b[1] < a[1] ? -1 : 0,
    )
    const incomeSources = sortedSources.slice(0, 5).map(([label, total]) => ({
      label,
      total: toD(total),
    }))
    const restTotal = sortedSources
      .slice(5)
      .reduce((sum, [, total]) => sum + total, 0n)
    if (restTotal > 0n) {
      incomeSources.push({ label: "Other", total: toD(restTotal) })
    }

    const months = buckets.map(({ month, year, key, label }) => {
      const spend = spendMap.get(key)!
      const inc = incomeMap.get(key)!
      const granular = granularMap.get(key)!

      const expenseCategories: Record<string, number> = {}
      let otherMinor = 0n
      for (const [cat, amount] of granular.entries()) {
        if (topCategoryKeys.includes(cat)) {
          expenseCategories[cat] = toD(amount)
        } else {
          otherMinor += amount
        }
      }
      if (otherMinor > 0n) expenseCategories.other = toD(otherMinor)

      return {
        month,
        year,
        label,
        spend: {
          fixedCosts: toD(spend.fixedCosts),
          savings: toD(spend.savings),
          investment: toD(spend.investment),
          guiltFreeSpending: toD(spend.guiltFreeSpending),
        },
        allocated: {
          fixedCosts: toD(inc.fixedCosts),
          savings: toD(inc.savings),
          investment: toD(inc.investment),
          guiltFreeSpending: toD(inc.guiltFreeSpending),
        },
        totalIncome: toD(inc.income),
        expenseCategories,
      }
    })

    return NextResponse.json({ months, topCategories: topCategoryKeys, incomeSources }, {
      headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" },
    })
  } catch (error) {
    console.error("Error fetching spending trends:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
