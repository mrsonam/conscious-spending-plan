-- AlterTable
ALTER TABLE "IncomeEntry" ADD COLUMN     "excludeFromAllocation" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "InvestmentHolding" ADD COLUMN     "brokerageFee" DOUBLE PRECISION;
