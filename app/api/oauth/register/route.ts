import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { readJsonBody } from "@/lib/route-error"
import { isAllowedRedirectUri } from "@/lib/oauth-server"

const NAME_MAX = 80
const REDIRECTS_MAX = 10

type RegisterBody = {
  client_name?: unknown
  redirect_uris?: unknown
}

/** RFC 7591 dynamic client registration (public clients only, no secret). */
export async function POST(request: Request) {
  const body = await readJsonBody<RegisterBody>(request)
  if (!body) {
    return NextResponse.json({ error: "invalid_client_metadata" }, { status: 400 })
  }

  const redirectUris = Array.isArray(body.redirect_uris)
    ? body.redirect_uris.filter((u): u is string => typeof u === "string")
    : []
  if (
    redirectUris.length === 0 ||
    redirectUris.length > REDIRECTS_MAX ||
    !redirectUris.every(isAllowedRedirectUri)
  ) {
    return NextResponse.json(
      {
        error: "invalid_redirect_uri",
        error_description: "redirect_uris must be https, or http on localhost.",
      },
      { status: 400 },
    )
  }

  const name =
    typeof body.client_name === "string" && body.client_name.trim()
      ? body.client_name.trim().slice(0, NAME_MAX)
      : "MCP client"

  const client = await prisma.oAuthClient.create({
    data: { name, redirectUris },
  })

  return NextResponse.json(
    {
      client_id: client.id,
      client_name: client.name,
      redirect_uris: client.redirectUris,
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
    },
    { status: 201, headers: { "Access-Control-Allow-Origin": "*" } },
  )
}
