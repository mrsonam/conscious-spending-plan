import { NextResponse } from "next/server"
import { moneyJsonResponse } from "@/lib/api-money-response"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildAllocatedSoFarFromEntries } from "@/lib/income-allocation"
import {
  ensureMonthlyCategoryBalances,
  getCurrentMonthCategoryBalances,
  getIncomeEntriesForMonthByDate,
} from "@/lib/monthly-tracking"
import { mapMoneyListToApi, CATEGORY_BALANCE_FIELDS } from "@/lib/money-serialize"
import { currencyFromSession } from "@/lib/user-currency"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = currencyFromSession(session.user.displayCurrency)
    await ensureMonthlyCategoryBalances(session.user.id)

    const [balances, fundAllocation, monthEntries] = await Promise.all([
      getCurrentMonthCategoryBalances(session.user.id),
      prisma.fundAllocation.findUnique({
        where: { userId: session.user.id },
      }),
      getIncomeEntriesForMonthByDate(session.user.id),
    ])

    const incomeEntries = monthEntries.filter(
      (entry) => entry.excludeFromAllocation !== true,
    )
    const allocatedFromIncomeByCategory = fundAllocation
      ? buildAllocatedSoFarFromEntries(incomeEntries, fundAllocation, currency)
      : null

    const balancesWithIncomeAlloc = balances.map((row) => ({
      ...row,
      allocatedFromIncome:
        allocatedFromIncomeByCategory?.[
          row.category as keyof typeof allocatedFromIncomeByCategory
        ] ?? 0n,
    }))

    return moneyJsonResponse(
      {
        balances: mapMoneyListToApi(
          balancesWithIncomeAlloc as unknown as Record<string, unknown>[],
          currency,
          CATEGORY_BALANCE_FIELDS,
        ),
      },
      currency,
    )
  } catch (error) {
    console.error("Error fetching category balances:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
