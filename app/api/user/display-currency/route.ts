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

  const code =
    body && typeof body === "object" && "displayCurrency" in body
      ? (body as { displayCurrency: unknown }).displayCurrency
      : undefined

  if (!isValidDisplayCurrency(code)) {
    return NextResponse.json(
      { error: "displayCurrency must be a supported ISO 4217 code" },
      { status: 400 }
    )
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { displayCurrency: code },
  })

  return NextResponse.json({ displayCurrency: code })
}
