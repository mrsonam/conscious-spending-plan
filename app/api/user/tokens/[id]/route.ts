import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { routeErrorResponse } from "@/lib/route-error"

/** DELETE, revoke a token (sets `revokedAt`; row is preserved for audit). */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const existing = await prisma.apiToken.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true, revokedAt: true },
    })
    if (!existing) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 })
    }
    if (existing.revokedAt) {
      return NextResponse.json({ ok: true, alreadyRevoked: true })
    }

    await prisma.apiToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return routeErrorResponse(error, "Error revoking API token")
  }
}
