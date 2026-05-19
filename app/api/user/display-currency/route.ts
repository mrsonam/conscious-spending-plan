import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isValidDisplayCurrency } from "@/lib/display-currency"

export async function PATCH(request: Request) {
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

  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : null
  const code = record?.displayCurrency
  const rawName = record?.name

  if (!isValidDisplayCurrency(code)) {
    return NextResponse.json(
      { error: "displayCurrency must be a supported ISO 4217 code" },
      { status: 400 }
    )
  }

  const data: { displayCurrency: string; name?: string | null } = {
    displayCurrency: code,
  }

  if (rawName !== undefined) {
    if (typeof rawName !== "string") {
      return NextResponse.json({ error: "name must be a string" }, { status: 400 })
    }
    const trimmed = rawName.trim()
    if (trimmed.length > 120) {
      return NextResponse.json({ error: "name is too long" }, { status: 400 })
    }
    data.name = trimmed.length > 0 ? trimmed : null
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data,
  })

  return NextResponse.json({ displayCurrency: code, name: data.name ?? undefined })
}
