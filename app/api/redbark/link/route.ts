import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { readJsonBody, routeErrorResponse } from "@/lib/route-error"

// POST /api/redbark/link, set or clear the redbarkAccountId on an account
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await readJsonBody<{
      accountId?: unknown
      redbarkAccountId?: unknown
    }>(request)
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const { accountId, redbarkAccountId } = body
    if (!accountId || typeof accountId !== "string") {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 })
    }
    if (redbarkAccountId != null && typeof redbarkAccountId !== "string") {
      return NextResponse.json({ error: "redbarkAccountId must be a string" }, { status: 400 })
    }

    const existing = await prisma.account.findFirst({
      where: { id: accountId, userId: session.user.id },
    })
    if (!existing) return NextResponse.json({ error: "Account not found" }, { status: 404 })

    const account = await prisma.account.update({
      where: { id: accountId },
      data: { redbarkAccountId: redbarkAccountId ?? null },
      select: { id: true, name: true, redbarkAccountId: true },
    })

    return NextResponse.json({ account })
  } catch (error) {
    return routeErrorResponse(error, "Error linking Redbark account")
  }
}
