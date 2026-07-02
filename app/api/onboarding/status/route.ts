import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getOnboardingStatus } from "@/lib/onboarding-server"
import { routeErrorResponse } from "@/lib/route-error"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const status = await getOnboardingStatus(session.user.id)
    return NextResponse.json(status)
  } catch (error) {
    return routeErrorResponse(error, "Error fetching onboarding status")
  }
}
