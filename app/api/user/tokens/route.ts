import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateApiToken } from "@/lib/api-token"

const NAME_MAX = 60

/** GET — list tokens (including plaintext) for the current user. */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tokens = await prisma.apiToken.findMany({
    where: { userId: session.user.id, revokedAt: null },
    select: {
      id: true,
      name: true,
      prefix: true,
      token: true,
      createdAt: true,
      lastUsedAt: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ tokens })
}

/**
 * POST — create a new token. Stores plaintext so the user can always
 * copy it later from the Shortcuts page.
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const rawName =
    body && typeof body === "object" && "name" in body
      ? (body as { name: unknown }).name
      : undefined
  const name = typeof rawName === "string" ? rawName.trim() : ""

  if (!name) {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 }
    )
  }
  if (name.length > NAME_MAX) {
    return NextResponse.json(
      { error: `name must be ${NAME_MAX} characters or fewer` },
      { status: 400 }
    )
  }

  const { token, hash, prefix } = generateApiToken()

  const created = await prisma.apiToken.create({
    data: {
      userId: session.user.id,
      name,
      tokenHash: hash,
      token,
      prefix,
    },
    select: {
      id: true,
      name: true,
      prefix: true,
      token: true,
      createdAt: true,
      lastUsedAt: true,
    },
  })

  return NextResponse.json(created, { status: 201 })
}
