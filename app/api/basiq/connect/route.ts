import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createBasiqUser, createConsentUrl } from "@/lib/basiq-client"

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const existing = await prisma.basiqConnection.findFirst({
      where: { userId: session.user.id },
    })
    let basiqUserId = existing?.basiqUserId

    if (!basiqUserId) {
      basiqUserId = await createBasiqUser(session.user.email ?? session.user.id)
    }

    const consentUrl = await createConsentUrl(basiqUserId)

    return NextResponse.json({ consentUrl, basiqUserId })
  } catch (error) {
    console.error("Basiq connect error:", error)
    return NextResponse.json(
      { error: "Failed to initiate bank connection" },
      { status: 500 }
    )
  }
}
