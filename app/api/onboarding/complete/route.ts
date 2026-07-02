import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { completeOnboarding } from "@/lib/onboarding-server"
import { routeErrorResponse } from "@/lib/route-error"

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const accountCount = await prisma.account.count({ where: { userId } })

    if (accountCount < 1) {
      return NextResponse.json(
        { error: "Add at least one account before finishing setup." },
        { status: 400 },
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingBucketsSavedAt: true },
    })

    if (!user?.onboardingBucketsSavedAt) {
      return NextResponse.json(
        { error: "Save your bucket splits before finishing setup." },
        { status: 400 },
      )
    }

    await completeOnboarding(userId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return routeErrorResponse(error, "Error completing onboarding")
  }
}
