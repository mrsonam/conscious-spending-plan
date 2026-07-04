import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { currencyFromSession } from "@/lib/user-currency"
import { getDbErrorResponse } from "@/lib/db-error"
import { loadDashboardConsoleData } from "@/lib/dashboard-console-server"
import { buildInsightsOverview } from "@/lib/insights-overview"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currency = currencyFromSession(session.user.displayCurrency)
    const payload = await loadDashboardConsoleData(session.user.id, currency)
    const overview = buildInsightsOverview(payload)

    return NextResponse.json(
      { overview },
      {
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
        },
      },
    )
  } catch (error) {
    const dbErr = getDbErrorResponse(error)
    if (dbErr) return NextResponse.json(dbErr.body, { status: dbErr.status })
    console.error("Error fetching insights overview:", error)
    return NextResponse.json(
      { error: "Failed to load insights overview" },
      { status: 500 },
    )
  }
}
