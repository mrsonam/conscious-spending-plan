import { createHash, randomBytes } from "node:crypto"

/** Token format: `csp_` + 32 random bytes encoded as base64url (~43 chars). */
const TOKEN_PREFIX = "csp_"

export type GeneratedToken = {
  /** Plaintext token shown to the user once at creation. */
  token: string
  /** sha256 hex digest of `token` — stored in DB and used for lookup. */
  hash: string
  /** First 10 chars of `token` (e.g. `csp_abcdef`) for display in lists. */
  prefix: string
}

export function generateApiToken(): GeneratedToken {
  const random = randomBytes(32).toString("base64url")
  const token = `${TOKEN_PREFIX}${random}`
  return {
    token,
    hash: hashApiToken(token),
    prefix: token.slice(0, 10),
  }
}

export function hashApiToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

/**
 * Extract a bearer token from an `Authorization` header value.
 * Returns the raw token (e.g. `csp_xxx`) only when it looks like one of ours,
 * so we never hash arbitrary garbage from upstream.
 */
export function parseBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null
  const match = authHeader.match(/^Bearer\s+(\S+)$/i)
  if (!match) return null
  const token = match[1]
  if (!token.startsWith(TOKEN_PREFIX)) return null
  return token
}
