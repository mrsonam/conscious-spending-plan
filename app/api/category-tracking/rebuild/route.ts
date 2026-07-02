import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { normalizeDisplayCurrency } from "@/lib/display-currency"
import {
  listActiveTrackingMonths,
  refreshTrackingChain,
} from "@/lib/category-tracking-refresh"
import { routeErrorResponse } from "@/lib/route-error"

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const userId = session.user.id
    const currency = normalizeDisplayCurrency(session.user.displayCurrency)

    const months = await listActiveTrackingMonths(userId)
    if (months.length === 0) {
      return NextResponse.json({ ok: true, monthsRebuilt: 0 })
    }

    const start = months[0]
    const end = months[months.length - 1]

    await refreshTrackingChain(userId, currency, start, end)

    return NextResponse.json({ ok: true, monthsRebuilt: months.length })
  } catch (error) {
    return routeErrorResponse(error, "Error rebuilding category tracking")
  }
}
