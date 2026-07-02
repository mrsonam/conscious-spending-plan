import { NextResponse } from "next/server"
import { getDbErrorResponse } from "@/lib/db-error"

/**
 * Standard catch-block response for API routes: maps known DB errors to 503,
 * logs everything else and returns a generic 500 so no internals leak.
 */
export function routeErrorResponse(error: unknown, label: string): NextResponse {
  const dbErr = getDbErrorResponse(error)
  if (dbErr) return NextResponse.json(dbErr.body, { status: dbErr.status })
  console.error(`${label}:`, error)
  return NextResponse.json({ error: "Internal server error" }, { status: 500 })
}

/** Parse a JSON request body; returns null for a missing or malformed body. */
export async function readJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T
  } catch {
    return null
  }
}
