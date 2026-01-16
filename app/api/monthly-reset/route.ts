import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { ensureMonthlyCategoryBalances, getCurrentMonthYear } from "@/lib/monthly-tracking"

/**
 * API endpoint to ensure monthly reset is initialized
 * This can be called when a new month is detected
 */
export async function POST() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Ensure monthly category balances exist for current month
    // This creates fresh entries if it's a new month
    await ensureMonthlyCategoryBalances(session.user.id)

    const { month, year } = getCurrentMonthYear()

    return NextResponse.json({ 
      message: "Monthly tracking initialized",
      month,
      year,
    })
  } catch (error) {
    console.error("Error initializing monthly tracking:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
