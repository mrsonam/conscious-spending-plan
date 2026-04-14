-- Link each logged dividend to an IncomeEntry (statement + excludeFromAllocation).

ALTER TABLE "InvestmentDividend" ADD COLUMN "incomeEntryId" TEXT;

CREATE UNIQUE INDEX "InvestmentDividend_incomeEntryId_key" ON "InvestmentDividend"("incomeEntryId");

ALTER TABLE "InvestmentDividend" ADD CONSTRAINT "InvestmentDividend_incomeEntryId_fkey" FOREIGN KEY ("incomeEntryId") REFERENCES "IncomeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
