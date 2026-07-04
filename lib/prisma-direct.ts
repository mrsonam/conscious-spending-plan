import { PrismaClient } from "@prisma/client"
import { applyPrismaConnectionParams } from "@/lib/database-url"

const globalForDirect = globalThis as unknown as {
  directPrisma: PrismaClient | undefined
}

/** Prisma client on DIRECT_URL, required for DDL on Supabase (pooler rejects CREATE TABLE). */
export function getDirectPrisma(): PrismaClient {
  const rawUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL
  if (!rawUrl) {
    throw new Error("DATABASE_URL or DIRECT_URL must be set")
  }
  const url = applyPrismaConnectionParams(rawUrl)

  if (!globalForDirect.directPrisma) {
    globalForDirect.directPrisma = new PrismaClient({
      datasources: { db: { url } },
    })
  }

  return globalForDirect.directPrisma
}
