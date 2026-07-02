import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
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
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json() as { webhookSecret?: string; apiKey?: string }

  const connection = await prisma.redbarkConnection.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      webhookSecret: body.webhookSecret?.trim() ?? "",
      ...(body.apiKey !== undefined && { apiKey: body.apiKey.trim() || null }),
    },
    update: {
      ...(body.webhookSecret !== undefined && { webhookSecret: body.webhookSecret.trim() }),
      ...(body.apiKey !== undefined && { apiKey: body.apiKey.trim() || null }),
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
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await prisma.redbarkConnection.deleteMany({ where: { userId: session.user.id } })
  return NextResponse.json({ ok: true })
}
