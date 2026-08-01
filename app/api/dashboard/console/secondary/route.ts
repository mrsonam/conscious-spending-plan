import { NextResponse } from "next/server"
import { moneyJsonResponse } from "@/lib/api-money-response"
import { authFromRequest } from "@/lib/api-auth"
import { loadDashboardConsoleSecondaryData } from "@/lib/dashboard-console-server"
import { getUserDisplayCurrency } from "@/lib/user-currency"

export async function GET(request: Request) {
  try {
    const authed = await authFromRequest(request)

    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = await getUserDisplayCurrency(authed.userId)
    const payload = await loadDashboardConsoleSecondaryData(authed.userId, currency)

    return moneyJsonResponse(payload, currency, {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=90",
      },
    })
  } catch (error) {
    console.error("Error fetching dashboard console secondary:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
