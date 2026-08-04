import { NextResponse } from "next/server"
import { authFromRequest } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { getIncomePageStats } from "@/lib/income-summary"
import {
  getCurrentMonthIncomeEntries,
  getIncomeEntriesForMonthByDate,
} from "@/lib/monthly-tracking"
import {
  computeIncomeAllocationsMinor,
  incomeAllocationToApi,
  type CategoryKey,
  type IncomeAllocationMinor,
} from "@/lib/income-allocation"
import { serializeMoneyForApi } from "@/lib/money-api"
import {
  mapIncomeEntryListToApi,
  mapIncomeEntryToApi,
} from "@/lib/money-serialize"
import { moneyJsonResponse } from "@/lib/api-money-response"
import { getUserDisplayCurrency } from "@/lib/user-currency"
import { addMinor, coerceMinor } from "@/lib/money"

function sumAllocationsForMonth(
  monthEntries: { amount: bigint }[],
  fundAllocation: NonNullable<Awaited<ReturnType<typeof prisma.fundAllocation.findUnique>>>,
  currency: string
): { totals: IncomeAllocationMinor; totalIncome: bigint } {
  const totals: IncomeAllocationMinor = {
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
  let totalIncome = 0n

  for (const entry of monthEntries) {
    const incomeMinor = coerceMinor(entry.amount)
    totalIncome = addMinor(totalIncome, incomeMinor)
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

  return { totals, totalIncome }
}

export async function GET(request: Request) {
  try {
    const authed = await authFromRequest(request)

    if (!authed) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = authed.userId
    const currency = await getUserDisplayCurrency(userId)
    const { searchParams } = new URL(request.url)
    const latest = searchParams.get("latest") === "true"
    const currentMonth = searchParams.get("currentMonth") === "true"
    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")
    const forStatement = searchParams.get("forStatement") === "true"
    const includeStats = searchParams.get("includeStats") !== "false"

    if (currentMonth) {
      const allMonthEntries = await getIncomeEntriesForMonthByDate(userId)
      const monthEntries = allMonthEntries.filter(
        (entry) => entry.excludeFromAllocation !== true,
      )

      const totalIncomeIncludingAll = allMonthEntries.reduce(
        (sum, entry) => addMinor(sum, coerceMinor(entry.amount)),
        0n,
      )

      if (monthEntries.length === 0) {
        return moneyJsonResponse(
          {
            breakdown: {
              income: serializeMoneyForApi(totalIncomeIncludingAll, currency),
              fixedCosts: 0,
              savings: 0,
              investment: 0,
              guiltFreeSpending: 0,
              total: 0,
            },
            entries: mapIncomeEntryListToApi(
              allMonthEntries as unknown as Record<string, unknown>[],
              currency,
            ),
          },
          currency
        )
      }

      const fundAllocation = await prisma.fundAllocation.findUnique({
        where: { userId: userId }
      })

      if (!fundAllocation) {
        return moneyJsonResponse(
          {
            breakdown: null,
            entries: mapIncomeEntryListToApi(
              monthEntries as unknown as Record<string, unknown>[],
              currency,
            ),
          },
          currency
        )
      }

      const { totals, totalIncome } = sumAllocationsForMonth(
        monthEntries,
        fundAllocation,
        currency,
      )

      const breakdown = {
        ...incomeAllocationToApi(totalIncome, totals, currency),
        income: serializeMoneyForApi(totalIncomeIncludingAll, currency),
        total: serializeMoneyForApi(totalIncome, currency),
      }

      return moneyJsonResponse(
        {
          breakdown,
          entries: mapIncomeEntryListToApi(
            allMonthEntries as unknown as Record<string, unknown>[],
            currency,
          ),
          period: "currentMonth",
        },
        currency,
        {
          headers: {
            "Cache-Control": "private, max-age=20, stale-while-revalidate=60",
          },
        }
      )
    }

    if (latest) {
      const latestEntry = await prisma.incomeEntry.findFirst({
        where: { userId: userId },
        orderBy: { date: "desc" },
      })

      if (!latestEntry) {
        return moneyJsonResponse({ breakdown: null }, currency)
      }

      const fundAllocation = await prisma.fundAllocation.findUnique({
        where: { userId: userId }
      })

      if (!fundAllocation) {
        return moneyJsonResponse({ breakdown: null }, currency)
      }

      const incomeMinor = coerceMinor(latestEntry.amount)
      const alloc = computeIncomeAllocationsMinor(
        incomeMinor,
        fundAllocation,
        currency,
        () => 0n,
      )
      const breakdown = incomeAllocationToApi(incomeMinor, alloc, currency)

      const allMonthEntries = await getCurrentMonthIncomeEntries(userId)
      return moneyJsonResponse(
        {
          breakdown,
          entry: mapIncomeEntryToApi(
            latestEntry as unknown as Record<string, unknown>,
            currency,
          ),
          entries: mapIncomeEntryListToApi(
            allMonthEntries as unknown as Record<string, unknown>[],
            currency,
          ),
        },
        currency,
        {
          headers: {
            "Cache-Control": "private, max-age=20, stale-while-revalidate=60",
          },
        }
      )
    }

    const hasDateRange = startDateParam && endDateParam
    const hasPageParam = searchParams.has("page")
    if ((hasDateRange && !hasPageParam) || forStatement) {
      const where: { userId: string; date?: { gte: Date; lte: Date } } = { userId: userId }
      if (hasDateRange) {
        const start = new Date(startDateParam)
        const end = new Date(endDateParam)
        end.setHours(23, 59, 59, 999)
        where.date = { gte: start, lte: end }
      }
      const entries = await prisma.incomeEntry.findMany({
        where,
        include: {
          account: {
            select: { id: true, name: true, bankName: true, accountType: true },
          },
        },
        orderBy: { date: "desc" },
        take: 10000,
      })
      return moneyJsonResponse(
        {
          entries: mapIncomeEntryListToApi(
            entries as unknown as Record<string, unknown>[],
            currency,
          ),
        },
        currency,
        {
          headers: {
            "Cache-Control": "private, max-age=20, stale-while-revalidate=60",
          },
        }
      )
    }

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(20, Math.max(5, parseInt(searchParams.get("limit") || "10", 10)))
    const skip = (page - 1) * limit

    const where: { userId: string; date?: { gte: Date; lte: Date } } = { userId }
    if (hasDateRange) {
      const start = new Date(startDateParam)
      const end = new Date(endDateParam)
      end.setHours(23, 59, 59, 999)
      where.date = { gte: start, lte: end }
    }

    const [entries, total, stats] = await Promise.all([
      prisma.incomeEntry.findMany({
        where,
        include: { account: true },
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      prisma.incomeEntry.count({ where }),
      includeStats
        ? getIncomePageStats(userId)
        : Promise.resolve(null),
    ])

    return moneyJsonResponse(
      {
        entries: mapIncomeEntryListToApi(
          entries as unknown as Record<string, unknown>[],
          currency,
        ),
        total,
        page,
        limit,
        ...(stats ?? {}),
      },
      currency,
      {
        headers: {
          "Cache-Control": "private, max-age=20, stale-while-revalidate=60",
        },
      }
    )
  } catch (error) {
    console.error("Error fetching income entries:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const authed = await authFromRequest(request)

    if (!authed) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = authed.userId

    const [incomeResult, balanceResult] = await Promise.all([
      prisma.incomeEntry.deleteMany({
        where: { userId }
      }),
      prisma.categoryBalance.deleteMany({
        where: { userId }
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
