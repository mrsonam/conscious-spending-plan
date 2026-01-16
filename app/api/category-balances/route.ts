import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { ensureMonthlyCategoryBalances, getCurrentMonthCategoryBalances } from "@/lib/monthly-tracking"

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Ensure monthly balances exist and get them in parallel where possible
    // This is a lightweight operation, so we can do it synchronously
    await ensureMonthlyCategoryBalances(session.user.id)

    // Get current month's balances ONLY
    const balances = await getCurrentMonthCategoryBalances(session.user.id)

    return NextResponse.json({ balances })
  } catch (error) {
    console.error("Error fetching category balances:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
