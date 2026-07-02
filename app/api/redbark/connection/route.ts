import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { readJsonBody, routeErrorResponse } from "@/lib/route-error"

const SECRET_MAX = 500

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Return the connection including whether a signing secret has been configured.
    // The token is created eagerly on first GET so the user can copy the webhook URL
    // before going to Redbark to generate the signing secret.
    const connection = await prisma.redbarkConnection.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        webhookSecret: "", // placeholder — webhook requests will fail sig check until secret is set
      },
      update: {},
      select: { webhookToken: true, webhookSecret: true, apiKey: true, createdAt: true, updatedAt: true },
    })

    return NextResponse.json({
      connection: {
        webhookToken: connection.webhookToken,
        hasSecret: connection.webhookSecret.length > 0,
        hasApiKey: !!connection.apiKey,
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt,
      },
    })
  } catch (error) {
    return routeErrorResponse(error, "Error fetching Redbark connection")
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await readJsonBody<{ webhookSecret?: unknown; apiKey?: unknown }>(request)
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }
    if (body.webhookSecret !== undefined && typeof body.webhookSecret !== "string") {
      return NextResponse.json({ error: "webhookSecret must be a string" }, { status: 400 })
    }
    if (body.apiKey !== undefined && typeof body.apiKey !== "string") {
      return NextResponse.json({ error: "apiKey must be a string" }, { status: 400 })
    }
    if (
      (typeof body.webhookSecret === "string" && body.webhookSecret.length > SECRET_MAX) ||
      (typeof body.apiKey === "string" && body.apiKey.length > SECRET_MAX)
    ) {
      return NextResponse.json({ error: "Value is too long" }, { status: 400 })
    }

    const webhookSecret = typeof body.webhookSecret === "string" ? body.webhookSecret.trim() : undefined
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() || null : undefined

    const connection = await prisma.redbarkConnection.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        webhookSecret: webhookSecret ?? "",
        ...(apiKey !== undefined && { apiKey }),
      },
      update: {
        ...(webhookSecret !== undefined && { webhookSecret }),
        ...(apiKey !== undefined && { apiKey }),
      },
      select: { webhookToken: true, webhookSecret: true, apiKey: true, createdAt: true, updatedAt: true },
    })

    return NextResponse.json({
      connection: {
        webhookToken: connection.webhookToken,
        hasSecret: connection.webhookSecret.length > 0,
        hasApiKey: !!connection.apiKey,
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt,
      },
    })
  } catch (error) {
    return routeErrorResponse(error, "Error saving Redbark connection")
  }
}

export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await prisma.redbarkConnection.deleteMany({ where: { userId: session.user.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return routeErrorResponse(error, "Error deleting Redbark connection")
  }
}
