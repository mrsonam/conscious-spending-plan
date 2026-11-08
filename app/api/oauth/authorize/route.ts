import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  AUTH_CODE_TTL_MS,
  generateAuthorizationCode,
  redirectWithParams,
  requestOrigin,
} from "@/lib/oauth-server"

/** Consent form submit: issue a single-use code (allow) or report access_denied. */
export async function POST(request: Request) {
  // Only accept the consent form posted from our own page.
  const origin = request.headers.get("origin")
  if (origin && origin !== requestOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const form = await request.formData()
  const field = (k: string) => {
    const v = form.get(k)
    return typeof v === "string" ? v : ""
  }
  const clientId = field("client_id")
  const redirectUri = field("redirect_uri")
  const codeChallenge = field("code_challenge")
  const state = field("state") || null

  const client = clientId
    ? await prisma.oAuthClient.findUnique({ where: { id: clientId } })
    : null
  if (!client || !client.redirectUris.includes(redirectUri) || !codeChallenge) {
    return NextResponse.json({ error: "Invalid authorization request" }, { status: 400 })
  }

  if (field("decision") !== "allow") {
    return NextResponse.redirect(
      redirectWithParams(redirectUri, { error: "access_denied", state }),
      303,
    )
  }

  const { code, hash } = generateAuthorizationCode()
  await prisma.oAuthAuthorizationCode.create({
    data: {
      codeHash: hash,
      clientId: client.id,
      userId: session.user.id,
      redirectUri,
      codeChallenge,
      expiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS),
    },
  })

  return NextResponse.redirect(redirectWithParams(redirectUri, { code, state }), 303)
}
