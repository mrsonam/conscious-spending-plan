import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateApiToken } from "@/lib/api-token"
import { hashSecret, OAUTH_SCOPE, verifyPkceS256 } from "@/lib/oauth-server"

const TOKENS_MAX = 25
const NAME_MAX = 60

function oauthError(error: string, description: string, status = 400) {
  return NextResponse.json(
    { error, error_description: description },
    { status, headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" } },
  )
}

async function readParams(request: Request): Promise<URLSearchParams> {
  const type = request.headers.get("content-type") ?? ""
  if (type.includes("application/json")) {
    const json = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(json)) if (typeof v === "string") params.set(k, v)
    return params
  }
  return new URLSearchParams(await request.text())
}

/**
 * Exchange an authorization code (with PKCE verifier) for an access token.
 * The access token is a regular `csp_` ApiToken tied to the OAuth client, so it
 * works with every bearer-enabled route and can be revoked like any other token.
 */
export async function POST(request: Request) {
  const params = await readParams(request)
  if (params.get("grant_type") !== "authorization_code") {
    return oauthError("unsupported_grant_type", "Only authorization_code is supported.")
  }

  const code = params.get("code")
  const verifier = params.get("code_verifier")
  const clientId = params.get("client_id")
  const redirectUri = params.get("redirect_uri")
  if (!code || !verifier || !clientId || !redirectUri) {
    return oauthError(
      "invalid_request",
      "code, code_verifier, client_id and redirect_uri are required.",
    )
  }

  const record = await prisma.oAuthAuthorizationCode.findUnique({
    where: { codeHash: hashSecret(code) },
    include: { client: { select: { name: true } } },
  })
  if (
    !record ||
    record.usedAt ||
    record.expiresAt < new Date() ||
    record.clientId !== clientId ||
    record.redirectUri !== redirectUri ||
    !verifyPkceS256(verifier, record.codeChallenge)
  ) {
    return oauthError("invalid_grant", "Authorization code is invalid or expired.")
  }

  // Single use: only the request that flips usedAt may continue.
  const claimed = await prisma.oAuthAuthorizationCode.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  })
  if (claimed.count === 0) {
    return oauthError("invalid_grant", "Authorization code was already used.")
  }

  // Reconnecting the same client replaces its previous token.
  await prisma.apiToken.updateMany({
    where: { userId: record.userId, oauthClientId: record.clientId, revokedAt: null },
    data: { revokedAt: new Date() },
  })

  const activeCount = await prisma.apiToken.count({
    where: { userId: record.userId, revokedAt: null },
  })
  if (activeCount >= TOKENS_MAX) {
    return oauthError(
      "invalid_request",
      `You can have at most ${TOKENS_MAX} active tokens. Revoke one in your profile first.`,
    )
  }

  const { token, hash, prefix } = generateApiToken()
  await prisma.apiToken.create({
    data: {
      userId: record.userId,
      name: `Claude connector – ${record.client.name}`.slice(0, NAME_MAX),
      tokenHash: hash,
      prefix,
      oauthClientId: record.clientId,
    },
  })

  return NextResponse.json(
    { access_token: token, token_type: "Bearer", scope: OAUTH_SCOPE },
    { headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" } },
  )
}
