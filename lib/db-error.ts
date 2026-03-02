/**
 * Detects database connection/configuration errors from Prisma and maps them to a safe API response.
 * Use in API route catch blocks to return 503 with a clear message when the DB is unreachable or misconfigured.
 */
export function getDbErrorResponse(error: unknown): { status: number; body: { error: string } } | null {
  if (!error || typeof error !== "object") return null
  const message = error instanceof Error ? error.message : String(error)
  const isConnectionError =
    message.includes("Can't reach database server") ||
    message.includes("Connection refused") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ETIMEDOUT") ||
    message.includes("connection timeout") ||
    (error as { code?: string }).code === "P1001"
  const isTenantOrUserError =
    message.includes("Tenant or user not found") ||
    message.includes("FATAL:") && message.includes("not found")
  if (isConnectionError) {
    return {
      status: 503,
      body: {
        error:
          "Database is temporarily unavailable. Check your internet connection and that your database host (e.g. Supabase) is running.",
      },
    }
  }
  if (isTenantOrUserError) {
    return {
      status: 503,
      body: {
        error:
          "Database configuration error: tenant or user not found. In Supabase, check that the project is active and DATABASE_URL uses the correct user and password (Settings → Database).",
      },
    }
  }
  return null
}
