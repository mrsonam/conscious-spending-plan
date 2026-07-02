import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST /api/redbark/link — set or clear the redbarkAccountId on an account
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { accountId, redbarkAccountId } = await request.json() as {
    accountId?: string
    redbarkAccountId?: string | null
  }

  if (!accountId) return NextResponse.json({ error: "accountId is required" }, { status: 400 })

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
}
