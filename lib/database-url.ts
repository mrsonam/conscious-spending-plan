/** True when DATABASE_URL routes queries through Prisma Accelerate. */
export function isAccelerateDatabaseUrl(url: string): boolean {
  return url.startsWith("prisma://") || url.startsWith("prisma+")
}

/**
 * Cap the Prisma connection pool for direct Postgres URLs.
 * Skips Accelerate URLs (pooling is handled by Accelerate).
 */
export function applyPrismaConnectionParams(url: string): string {
  if (isAccelerateDatabaseUrl(url) || url.includes("connection_limit=")) {
    return url
  }

  const limit = process.env.PRISMA_CONNECTION_LIMIT ?? "3"
  const separator = url.includes("?") ? "&" : "?"
  return `${url}${separator}connection_limit=${limit}&pool_timeout=20`
}

export function resolvePrismaDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error("DATABASE_URL must be set")
  }
  return applyPrismaConnectionParams(url)
}

export function warnAboutMisconfiguredDatabaseUrl(url: string): void {
  if (process.env.NODE_ENV !== "development") return
  if (!url.includes("prisma_migration")) return

  console.warn(
    "[database] DATABASE_URL uses the prisma_migration role, which allows very few connections. " +
      "Point DATABASE_URL at the Supabase pooler (port 6543, postgres role) and keep DIRECT_URL for migrations.",
  )
}
