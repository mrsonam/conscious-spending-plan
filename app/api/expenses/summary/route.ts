import { NextResponse } from "next/server"
import { moneyJsonResponse } from "@/lib/api-money-response"
import { auth } from "@/lib/auth"
import { getDbErrorResponse } from "@/lib/db-error"
import { getExpenseSummary } from "@/lib/expense-summary"
import { currencyFromSession } from "@/lib/user-currency"

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const monthParam = parseInt(searchParams.get("month") ?? "", 10)
    const yearParam = parseInt(searchParams.get("year") ?? "", 10)
    const hasValidMonth =
      Number.isInteger(monthParam) && monthParam >= 1 && monthParam <= 12 &&
      Number.isInteger(yearParam) && yearParam >= 2000 && yearParam <= 2100
    const referenceDate = hasValidMonth ? new Date(yearParam, monthParam - 1, 15) : undefined

    const currency = currencyFromSession(session.user.displayCurrency)
    const summary = await getExpenseSummary(session.user.id, referenceDate)

    return moneyJsonResponse(summary, currency, {
      headers: {
        "Cache-Control": "private, max-age=20, stale-while-revalidate=60",
      },
    })
  } catch (error) {
    const dbErr = getDbErrorResponse(error)
    if (dbErr) return NextResponse.json(dbErr.body, { status: dbErr.status })
    console.error("Error fetching expense summary:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
