import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getBasiqAccounts, getBasiqConnections } from "@/lib/basiq-client"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const basiqUserId = searchParams.get("basiqUserId")
    if (!basiqUserId) {
      return NextResponse.json({ error: "basiqUserId required" }, { status: 400 })
    }

    const [basiqAccounts, appAccounts, connections] = await Promise.all([
      getBasiqAccounts(basiqUserId),
      prisma.account.findMany({
        where: { userId: session.user.id },
        select: { id: true, name: true, bankName: true, accountType: true },
        orderBy: { createdAt: "asc" },
      }),
      getBasiqConnections(basiqUserId),
    ])

    return NextResponse.json({
      basiqAccounts,
      appAccounts,
      connections,
    })
  } catch (error) {
    console.error("Basiq accounts error:", error)
    return NextResponse.json(
      { error: "Failed to fetch bank accounts" },
      { status: 500 }
    )
  }
}
