import { getDirectPrisma } from "@/lib/prisma-direct"

let tableReady = false
let ensurePromise: Promise<void> | null = null

/** Idempotent DDL when migrate deploy cannot run (Supabase pooler / P1002). */
export async function ensureCategoryBucketTransferTable(): Promise<void> {
  if (tableReady) return
  if (ensurePromise) return ensurePromise

  ensurePromise = (async () => {
    const db = getDirectPrisma()

    const rows = await db.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'CategoryBucketTransfer'
      ) AS exists
    `

    if (rows[0]?.exists) {
      tableReady = true
      return
    }

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CategoryBucketTransfer" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "fromCategory" TEXT NOT NULL,
        "toCategory" TEXT NOT NULL,
        "amount" BIGINT NOT NULL,
        "month" INTEGER NOT NULL,
        "year" INTEGER NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "CategoryBucketTransfer_pkey" PRIMARY KEY ("id")
      );
    `)

    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "CategoryBucketTransfer_userId_month_year_idx"
        ON "CategoryBucketTransfer"("userId", "month", "year");
    `)

    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "CategoryBucketTransfer_userId_createdAt_idx"
        ON "CategoryBucketTransfer"("userId", "createdAt");
    `)

    await db.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'CategoryBucketTransfer_userId_fkey'
        ) THEN
          ALTER TABLE "CategoryBucketTransfer"
            ADD CONSTRAINT "CategoryBucketTransfer_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `)

    const verify = await db.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'CategoryBucketTransfer'
      ) AS exists
    `

    if (!verify[0]?.exists) {
      throw new Error(
        "CategoryBucketTransfer table could not be created. Run prisma/scripts/fix-migration-p1002.sql in Supabase SQL Editor (DDL requires direct DB connection, not transaction pooler)."
      )
    }

    tableReady = true
  })()

  return ensurePromise
}

export function isMissingCategoryBucketTransferTable(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2021"
  )
}
