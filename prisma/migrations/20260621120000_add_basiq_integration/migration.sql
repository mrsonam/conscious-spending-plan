-- Basiq bank sync: connection table + external id / source columns

-- AlterTable Account
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "basiqAccountId" TEXT;
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "lastSyncedAt" TIMESTAMP(3);

-- AlterTable IncomeEntry
ALTER TABLE "IncomeEntry" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
ALTER TABLE "IncomeEntry" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'manual';

-- AlterTable Expense
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "syncStatus" TEXT NOT NULL DEFAULT 'confirmed';

-- CreateTable BasiqConnection
CREATE TABLE IF NOT EXISTS "BasiqConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "basiqUserId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BasiqConnection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BasiqConnection_userId_idx" ON "BasiqConnection"("userId");

CREATE UNIQUE INDEX IF NOT EXISTS "BasiqConnection_userId_connectionId_key" ON "BasiqConnection"("userId", "connectionId");

CREATE UNIQUE INDEX IF NOT EXISTS "IncomeEntry_userId_externalId_key" ON "IncomeEntry"("userId", "externalId");

CREATE UNIQUE INDEX IF NOT EXISTS "Expense_userId_externalId_key" ON "Expense"("userId", "externalId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BasiqConnection_userId_fkey'
  ) THEN
    ALTER TABLE "BasiqConnection"
      ADD CONSTRAINT "BasiqConnection_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
