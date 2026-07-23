import { NextResponse } from "next/server"
import { OAuth2Client } from "google-auth-library"
import { prisma } from "@/lib/prisma"
import { generateApiToken } from "@/lib/api-token"
import { findOrCreateOAuthUser } from "@/lib/oauth-user"
import { normalizeDisplayCurrency } from "@/lib/display-currency"
import { routeErrorResponse, readJsonBody } from "@/lib/route-error"

const TOKENS_MAX = 25
const NAME_MAX = 60

type GoogleMobileLoginBody = {
  idToken?: unknown
  deviceName?: unknown
}

export async function POST(request: Request) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID
    if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json(
        { error: "Google sign-in is not configured on this server" },
        { status: 503 },
      )
    }

    const body = await readJsonBody<GoogleMobileLoginBody>(request)
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const { idToken, deviceName } = body
    if (typeof idToken !== "string" || !idToken) {
      return NextResponse.json({ error: "idToken is required" }, { status: 400 })
    }

    const client = new OAuth2Client(clientId)
    let payload
    try {
      const ticket = await client.verifyIdToken({ idToken, audience: clientId })
      payload = ticket.getPayload()
    } catch {
      return NextResponse.json({ error: "Invalid Google token" }, { status: 401 })
    }

    if (!payload?.email || !payload.email_verified) {
      return NextResponse.json({ error: "Invalid Google token" }, { status: 401 })
    }

    const user = await findOrCreateOAuthUser(payload.email, payload.name ?? null)

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
    return routeErrorResponse(error, "Error logging in from mobile via Google")
  }
}
