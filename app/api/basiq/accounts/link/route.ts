import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  getBasiqAccounts,
  getBasiqConnections,
  registerBasiqWebhook,
} from "@/lib/basiq-client"

type Mapping = {
  basiqAccountId: string
  appAccountId?: string
  createNew?: boolean
  name?: string
  accountType?: string
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { mappings } = body as { mappings: Mapping[] }

    if (!mappings?.length) {
      return NextResponse.json({ error: "Mappings required" }, { status: 400 })
    }

    const existingConn = await prisma.basiqConnection.findFirst({
      where: { userId: session.user.id },
    })
    if (!existingConn) {
      return NextResponse.json({ error: "No Basiq connection found — connect first" }, { status: 400 })
    }
    const basiqUserId = existingConn.basiqUserId

    const [verifiedAccounts, verifiedConnections] = await Promise.all([
      getBasiqAccounts(basiqUserId),
      getBasiqConnections(basiqUserId),
    ])

    const validBasiqAccountIds = new Set(verifiedAccounts.map((a) => a.id))

    await prisma.$transaction(async (tx) => {
      for (const m of mappings) {
        if (!validBasiqAccountIds.has(m.basiqAccountId)) {
          throw new Error(`Invalid basiqAccountId: ${m.basiqAccountId}`)
        }

        if (m.createNew) {
          const basiqAcc = verifiedAccounts.find((a) => a.id === m.basiqAccountId)
          await tx.account.create({
            data: {
              userId: session.user.id,
              name: m.name ?? basiqAcc?.name ?? "Bank Account",
              bankName: basiqAcc?.institution ?? "CommBank",
              accountType: m.accountType ?? "checking",
              basiqAccountId: m.basiqAccountId,
            },
          })
        } else if (m.appAccountId) {
          const updated = await tx.account.updateMany({
            where: { id: m.appAccountId, userId: session.user.id },
            data: { basiqAccountId: m.basiqAccountId },
          })
          if (updated.count === 0) {
            throw new Error("Account not found or not owned by user")
          }
        }
      }

      for (const conn of verifiedConnections) {
        await tx.basiqConnection.upsert({
          where: {
            userId_connectionId: {
              userId: session.user.id,
              connectionId: conn.id,
            },
          },
          create: {
            userId: session.user.id,
            basiqUserId,
            connectionId: conn.id,
            institutionId: conn.institution.id,
            institutionName: conn.institution.name,
            status: "active",
          },
          update: {
            status: conn.status === "active" ? "active" : conn.status,
          },
        })
      }
    })

    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL
      if (baseUrl) {
        const webhookUrl = `${baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`}/api/basiq/webhook`
        await registerBasiqWebhook(webhookUrl)
      }
    } catch (e) {
      console.warn("Webhook registration failed (non-fatal):", e)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Basiq link error:", error)
    return NextResponse.json(
      { error: "Failed to link accounts" },
      { status: 500 }
    )
  }
}
