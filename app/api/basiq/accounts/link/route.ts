import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { registerBasiqWebhook } from "@/lib/basiq-client"

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
    const { mappings, basiqUserId, connections } = body as {
      mappings: Mapping[]
      basiqUserId: string
      connections: Array<{ id: string; institution: { id: string; name: string } }>
    }

    if (!mappings?.length || !basiqUserId) {
      return NextResponse.json({ error: "Mappings and basiqUserId required" }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      for (const m of mappings) {
        if (m.createNew) {
          await tx.account.create({
            data: {
              userId: session.user.id,
              name: m.name ?? "Bank Account",
              bankName: "CommBank",
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

      for (const conn of connections ?? []) {
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
            status: "active",
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
