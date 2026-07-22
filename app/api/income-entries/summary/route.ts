import { NextResponse } from "next/server"
import { moneyJsonResponse } from "@/lib/api-money-response"
import { authFromRequest } from "@/lib/api-auth"
import { getIncomePageStats } from "@/lib/income-summary"
import { getUserDisplayCurrency } from "@/lib/user-currency"
import { getDbErrorResponse } from "@/lib/db-error"

export async function GET(request: Request) {
  try {
    const authed = await authFromRequest(request)

    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = await getUserDisplayCurrency(authed.userId)
    const stats = await getIncomePageStats(authed.userId)

    return moneyJsonResponse(stats, currency, {
      headers: {
        "Cache-Control": "private, max-age=20, stale-while-revalidate=60",
      },
    })
  } catch (error) {
    const dbErr = getDbErrorResponse(error)
    if (dbErr) return NextResponse.json(dbErr.body, { status: dbErr.status })
    console.error("Error fetching income summary:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
