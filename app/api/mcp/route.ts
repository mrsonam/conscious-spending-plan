import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"
import { prisma } from "@/lib/prisma"
import { hashApiToken, parseBearerToken } from "@/lib/api-token"
import { createMcpServer } from "@/lib/mcp/server"
import { protectedResourceMetadataUrl, requestOrigin } from "@/lib/oauth-server"

export const runtime = "nodejs"
export const maxDuration = 60

function unauthorized(request: Request) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: {
      "content-type": "application/json",
      "WWW-Authenticate": `Bearer resource_metadata="${protectedResourceMetadataUrl(requestOrigin(request))}"`,
    },
  })
}

/**
 * Remote MCP endpoint (Streamable HTTP, stateless) for the Claude connector.
 * Auth is bearer-only: a `csp_` token from the OAuth flow or a personal token.
 */
async function handle(request: Request) {
  const token = parseBearerToken(request.headers.get("authorization"))
  if (!token) return unauthorized(request)

  const record = await prisma.apiToken.findUnique({
    where: { tokenHash: hashApiToken(token) },
    select: { id: true, userId: true, revokedAt: true },
  })
  if (!record || record.revokedAt) return unauthorized(request)

  prisma.apiToken
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {
      /* ignore */
    })

  const server = createMcpServer({
    userId: record.userId,
    token,
    origin: requestOrigin(request),
  })
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })
  await server.connect(transport)
  try {
    return await transport.handleRequest(request)
  } finally {
    void server.close()
  }
}

export { handle as GET, handle as POST, handle as DELETE }
