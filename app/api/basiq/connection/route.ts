import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const connection = await prisma.basiqConnection.findFirst({
      where: { userId: session.user.id, status: "active" },
    })

    const linkedAccounts = await prisma.account.findMany({
      where: { userId: session.user.id, basiqAccountId: { not: null } },
      select: { id: true, name: true, bankName: true, lastSyncedAt: true },
    })

    return NextResponse.json({ connection, linkedAccounts })
  } catch (error) {
    console.error("Basiq connection error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.basiqConnection.deleteMany({
      where: { userId: session.user.id },
    })

    await prisma.account.updateMany({
      where: { userId: session.user.id, basiqAccountId: { not: null } },
      data: { basiqAccountId: null, lastSyncedAt: null },
    })

    return NextResponse.json({ message: "Bank disconnected" })
  } catch (error) {
    console.error("Basiq disconnect error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
