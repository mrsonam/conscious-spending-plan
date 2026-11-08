import { NextResponse } from "next/server"
import { authorizationServerMetadata, requestOrigin } from "@/lib/oauth-server"

/** RFC 8414 metadata so MCP clients (Claude) can discover the OAuth endpoints. */
export function GET(request: Request) {
  return NextResponse.json(authorizationServerMetadata(requestOrigin(request)), {
    headers: { "Access-Control-Allow-Origin": "*" },
  })
}
