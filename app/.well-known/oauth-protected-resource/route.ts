import { NextResponse } from "next/server"
import { protectedResourceMetadata, requestOrigin } from "@/lib/oauth-server"

/** RFC 9728 metadata pointing the MCP endpoint at this app's authorization server. */
export function GET(request: Request) {
  return NextResponse.json(protectedResourceMetadata(requestOrigin(request)), {
    headers: { "Access-Control-Allow-Origin": "*" },
  })
}
