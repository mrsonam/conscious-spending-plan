import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Prisma Client configuration optimized for Supabase/PostgreSQL
// Connection pooling is handled by Supabase connection string
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
