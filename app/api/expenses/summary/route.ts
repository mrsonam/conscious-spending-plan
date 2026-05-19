import { NextResponse } from "next/server"
import { moneyJsonResponse } from "@/lib/api-money-response"
import { auth } from "@/lib/auth"
import { getDbErrorResponse } from "@/lib/db-error"
import { getExpenseSummary } from "@/lib/expense-summary"
import { currencyFromSession } from "@/lib/user-currency"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = currencyFromSession(session.user.displayCurrency)
    const summary = await getExpenseSummary(session.user.id)

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
