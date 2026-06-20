import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'
import {
  isAccelerateDatabaseUrl,
  resolvePrismaDatabaseUrl,
  warnAboutMisconfiguredDatabaseUrl,
} from '@/lib/database-url'

const createPrismaClient = () => {
  const url = resolvePrismaDatabaseUrl()
  warnAboutMisconfiguredDatabaseUrl(process.env.DATABASE_URL ?? url)

  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: { db: { url } },
  })

  return isAccelerateDatabaseUrl(url) ? client.$extends(withAccelerate()) : client
}

type PrismaClientSingleton = ReturnType<typeof createPrismaClient>

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/** Accepts either the extended client or a Prisma transaction client. */
export type PrismaContext = typeof prisma | import('@prisma/client').Prisma.TransactionClient
