import { PrismaClient } from "@prisma/client"

const globalForDirect = globalThis as unknown as {
  directPrisma: PrismaClient | undefined
}

/** Prisma client on DIRECT_URL — required for DDL on Supabase (pooler rejects CREATE TABLE). */
export function getDirectPrisma(): PrismaClient {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL
  if (!url) {
    throw new Error("DATABASE_URL or DIRECT_URL must be set")
  }

  if (!globalForDirect.directPrisma) {
    globalForDirect.directPrisma = new PrismaClient({
      datasources: { db: { url } },
    })
  }

  return globalForDirect.directPrisma
}
