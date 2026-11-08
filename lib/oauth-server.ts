import { createHash, randomBytes } from "node:crypto"

export { isSafeCallbackPath } from "@/lib/oauth-paths"

/**
 * Minimal OAuth 2.1 authorization server used by the Claude MCP connector:
 * dynamic client registration, authorization code + PKCE (S256 only), and
 * access tokens that are ordinary `csp_` ApiTokens (so `authFromRequest`,
 * revocation and the tokens list all keep working unchanged).
 */

export const OAUTH_SCOPE = "transactions"
export const AUTH_CODE_TTL_MS = 10 * 60 * 1000
export const MCP_RESOURCE_PATH = "/api/mcp"

export function requestOrigin(request: Request) {
  return new URL(request.url).origin
}

export function authorizationServerMetadata(origin: string) {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/api/oauth/token`,
    registration_endpoint: `${origin}/api/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: [OAUTH_SCOPE],
  }
}

export function protectedResourceMetadata(origin: string) {
  return {
    resource: `${origin}${MCP_RESOURCE_PATH}`,
    authorization_servers: [origin],
    scopes_supported: [OAUTH_SCOPE],
    bearer_methods_supported: ["header"],
  }
}

export function protectedResourceMetadataUrl(origin: string) {
  return `${origin}/.well-known/oauth-protected-resource`
}

/** Redirect URIs must be https, or http on a loopback host (Claude Code / local clients). */
export function isAllowedRedirectUri(uri: string) {
  let url: URL
  try {
    url = new URL(uri)
  } catch {
    return false
  }
  if (url.hash) return false
  if (url.protocol === "https:") return true
  return (
    url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]")
  )
}

export function verifyPkceS256(verifier: string, challenge: string) {
  const computed = createHash("sha256").update(verifier).digest("base64url")
  return computed === challenge
}

export function generateAuthorizationCode() {
  const code = randomBytes(32).toString("base64url")
  return { code, hash: hashSecret(code) }
}

export function hashSecret(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

export type AuthorizeParams = {
  clientId: string
  redirectUri: string
  codeChallenge: string
  state: string | null
}

/**
 * Validate the query of an authorization request (without touching the DB).
 * Returns an error string for problems that must NOT be redirected back to the client.
 */
export function parseAuthorizeParams(
  get: (key: string) => string | null | undefined,
): AuthorizeParams | { error: string } {
  const clientId = get("client_id")
  const redirectUri = get("redirect_uri")
  const responseType = get("response_type")
  const codeChallenge = get("code_challenge")
  const method = get("code_challenge_method")
  if (!clientId) return { error: "Missing client_id." }
  if (!redirectUri) return { error: "Missing redirect_uri." }
  if (responseType !== "code") return { error: "Only response_type=code is supported." }
  if (!codeChallenge || method !== "S256") {
    return { error: "PKCE with code_challenge_method=S256 is required." }
  }
  return { clientId, redirectUri, codeChallenge, state: get("state") ?? null }
}

export function redirectWithParams(redirectUri: string, params: Record<string, string | null>) {
  const url = new URL(redirectUri)
  for (const [k, v] of Object.entries(params)) {
    if (v != null) url.searchParams.set(k, v)
  }
  return url.toString()
}
