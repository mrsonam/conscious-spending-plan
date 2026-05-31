import { NextResponse } from "next/server"
import { moneyJsonResponse } from "@/lib/api-money-response"
import { auth } from "@/lib/auth"
import { loadDashboardConsoleSecondaryData } from "@/lib/dashboard-console-server"
import { currencyFromSession } from "@/lib/user-currency"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = currencyFromSession(session.user.displayCurrency)
    const payload = await loadDashboardConsoleSecondaryData(session.user.id, currency)

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
