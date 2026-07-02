import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { validatePercentageAllocation, type OnboardingAllocationDraft } from "@/lib/onboarding"
import { fundAllocationFromApi } from "@/lib/fund-allocation-money"
import { currencyFromSession } from "@/lib/user-currency"
import { readJsonBody, routeErrorResponse } from "@/lib/route-error"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await readJsonBody<OnboardingAllocationDraft>(request)
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }
    const validationError = validatePercentageAllocation(body)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const currency = currencyFromSession(session.user.displayCurrency)
    const data = fundAllocationFromApi(body as unknown as Record<string, unknown>, currency)

    await prisma.$transaction([
      prisma.fundAllocation.upsert({
        where: { userId: session.user.id },
        update: data,
        create: { userId: session.user.id, ...data },
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data: { onboardingBucketsSavedAt: new Date() },
      }),
    ])

    return NextResponse.json({ ok: true })
  } catch (error) {
    return routeErrorResponse(error, "Error saving onboarding buckets")
  }
}
