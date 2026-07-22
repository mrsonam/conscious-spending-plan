import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateApiToken } from "@/lib/api-token"
import { verifyPassword } from "@/lib/verify-password"
import { normalizeEmail } from "@/lib/password-policy"
import { routeErrorResponse, readJsonBody } from "@/lib/route-error"
import { normalizeDisplayCurrency } from "@/lib/display-currency"

const TOKENS_MAX = 25
const NAME_MAX = 60

type MobileLoginBody = {
  email?: unknown
  password?: unknown
  deviceName?: unknown
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody<MobileLoginBody>(request)
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const { email, password, deviceName } = body

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email ||
      !password
    ) {
      return NextResponse.json(
        { error: "email and password are required" },
        { status: 400 },
      )
    }

    const normalizedEmail = normalizeEmail(email)
    const user = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: "insensitive" } },
    })

    const isValid = await verifyPassword(user?.password, password)
    if (!user || !isValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      )
    }

    const activeCount = await prisma.apiToken.count({
      where: { userId: user.id, revokedAt: null },
    })
    if (activeCount >= TOKENS_MAX) {
      return NextResponse.json(
        {
          error: `You can have at most ${TOKENS_MAX} active tokens. Revoke one first.`,
        },
        { status: 400 },
      )
    }

    const rawDeviceName =
      typeof deviceName === "string" ? deviceName.trim() : ""
    const name = `Mobile – ${rawDeviceName || "device"}`.slice(0, NAME_MAX)

    const { token, hash, prefix } = generateApiToken()

    const created = await prisma.apiToken.create({
      data: {
        userId: user.id,
        name,
        tokenHash: hash,
        token,
        prefix,
      },
      select: { id: true, name: true, token: true, createdAt: true },
    })

    return NextResponse.json(
      { ...created, displayCurrency: normalizeDisplayCurrency(user.displayCurrency) },
      { status: 201 },
    )
  } catch (error) {
    return routeErrorResponse(error, "Error logging in from mobile")
  }
}
