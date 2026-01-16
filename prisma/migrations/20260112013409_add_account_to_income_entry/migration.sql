-- AlterTable
ALTER TABLE "IncomeEntry" ADD COLUMN     "accountId" TEXT;

-- CreateIndex
CREATE INDEX "IncomeEntry_accountId_idx" ON "IncomeEntry"("accountId");

-- AddForeignKey
ALTER TABLE "IncomeEntry" ADD CONSTRAINT "IncomeEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
