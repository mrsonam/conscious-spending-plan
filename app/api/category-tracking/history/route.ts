import { NextResponse } from "next/server"
import { moneyJsonResponse } from "@/lib/api-money-response"
import { auth } from "@/lib/auth"
import { loadCategoryTrackingHistory } from "@/lib/category-tracking-history"
import { getCurrentMonthYear } from "@/lib/monthly-tracking"
import { currencyFromSession } from "@/lib/user-currency"

/**
 * Rolling fund-pillar history for trend analysis (last 6 months by default).
 * Uses the same envelope math as GET /api/category-tracking.
 */
export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = currencyFromSession(session.user.displayCurrency)
    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get("month")
    const yearParam = searchParams.get("year")
    const { month: currentMonth, year: currentYear } = getCurrentMonthYear()

    let endMonth = currentMonth
    let endYear = currentYear
    if (monthParam != null && yearParam != null) {
      const m = parseInt(monthParam, 10)
      const y = parseInt(yearParam, 10)
      if (
        !Number.isInteger(m) || m < 1 || m > 12 ||
        !Number.isInteger(y) || y < 2000 || y > 2100
      ) {
        return NextResponse.json({ error: "Invalid month or year" }, { status: 400 })
      }
      endMonth = m
      endYear = y
    }

    const history = await loadCategoryTrackingHistory(session.user.id, currency, {
      endMonth,
      endYear,
    })

    return moneyJsonResponse({ history }, currency, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
      },
    })
  } catch (error) {
    console.error("Error fetching category history:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
