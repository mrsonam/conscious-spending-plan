import { NextResponse } from "next/server"
import { moneyJsonResponse } from "@/lib/api-money-response"
import { auth } from "@/lib/auth"
import { ensureMonthlyCategoryBalances, getCurrentMonthCategoryBalances } from "@/lib/monthly-tracking"
import { mapMoneyListToApi, CATEGORY_BALANCE_FIELDS } from "@/lib/money-serialize"
import { currencyFromSession } from "@/lib/user-currency"

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
    await ensureMonthlyCategoryBalances(session.user.id)

    const balances = await getCurrentMonthCategoryBalances(session.user.id)

    return moneyJsonResponse(
      {
        balances: mapMoneyListToApi(
          balances as unknown as Record<string, unknown>[],
          currency,
          CATEGORY_BALANCE_FIELDS,
        ),
      },
      currency
    )
  } catch (error) {
    console.error("Error fetching category balances:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
