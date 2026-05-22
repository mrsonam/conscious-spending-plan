import { NextResponse } from "next/server"
import { moneyJsonResponse } from "@/lib/api-money-response"
import { auth } from "@/lib/auth"
import { FUND_CATEGORIES } from "@/lib/fund-allocation-fields"
import { reallocateMonthIncomeForUser } from "@/lib/reallocate-month-income"
import { serializeMoneyForApi } from "@/lib/money-api"
import { currencyFromSession } from "@/lib/user-currency"

/**
 * Recompute this month's income splits (per entry + envelope balances).
 * Caps use income allocated this month only; carryover is preserved on envelopes.
 */
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = currencyFromSession(session.user.displayCurrency)
    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get("month")
    const yearParam = searchParams.get("year")
    const month =
      monthParam != null ? parseInt(monthParam, 10) : undefined
    const year = yearParam != null ? parseInt(yearParam, 10) : undefined

    const result = await reallocateMonthIncomeForUser(
      session.user.id,
      currency,
      month,
      year,
    )

    return moneyJsonResponse(
      {
        message: "Month income reallocated successfully",
        month: result.month,
        year: result.year,
        entryCount: result.entryCount,
        incomeTotals: Object.fromEntries(
          FUND_CATEGORIES.map((cat) => [
            cat,
            serializeMoneyForApi(result.incomeTotals[cat], currency),
          ]),
        ),
        envelopeTotals: Object.fromEntries(
          FUND_CATEGORIES.map((cat) => [
            cat,
            serializeMoneyForApi(result.envelopeTotals[cat], currency),
          ]),
        ),
      },
      currency,
    )
  } catch (error) {
    console.error("Error reallocating month income:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
