import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getIncomePageStats } from "@/lib/income-summary"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const stats = await getIncomePageStats(session.user.id)

    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": "private, max-age=20, stale-while-revalidate=60",
      },
    })
  } catch (error) {
    console.error("Error fetching income summary:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
