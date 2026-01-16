-- AlterTable
ALTER TABLE "InvestmentHolding" ADD COLUMN     "numberOfShares" DOUBLE PRECISION,
ADD COLUMN     "pricePerUnit" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "InvestmentHolding_userId_name_idx" ON "InvestmentHolding"("userId", "name");
