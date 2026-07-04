import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hashApiToken, parseBearerToken } from "@/lib/api-token"

export type AuthResult =
  | { userId: string; via: "session" }
  | { userId: string; via: "token"; tokenId: string }

/**
 * Resolve the authenticated user for an API route.
 *
 * Order:
 *  1. NextAuth session cookie (the web app path, unchanged behavior).
 *  2. `Authorization: Bearer csp_...` personal token, looked up by sha256 hash.
 *
 * Returns `null` when no valid credential is present.
 */
export async function authFromRequest(req: Request): Promise<AuthResult | null> {
  const session = await auth()
  if (session?.user?.id) {
    return { userId: session.user.id, via: "session" }
  }

  const token = parseBearerToken(req.headers.get("authorization"))
  if (!token) return null

  const tokenHash = hashApiToken(token)
  const record = await prisma.apiToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, revokedAt: true },
  })
  if (!record || record.revokedAt) return null

  // Best-effort touch; don't fail the request if it errors.
  prisma.apiToken
    .update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      /* ignore */
    })

  return { userId: record.userId, via: "token", tokenId: record.id }
}
