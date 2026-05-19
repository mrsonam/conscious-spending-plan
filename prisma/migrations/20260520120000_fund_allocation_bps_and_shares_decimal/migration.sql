-- Split FundAllocation *Value into percent basis points + fixed minor; store shares as DECIMAL.

CREATE OR REPLACE FUNCTION "_csp_minor_factor"(currency TEXT) RETURNS INTEGER AS $$
BEGIN
  IF currency = 'JPY' THEN RETURN 1; END IF;
  RETURN 100;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- FundAllocation: percent bps + fixed minor per category
ALTER TABLE "FundAllocation" ADD COLUMN "fixedCostsPercentBps" INTEGER NOT NULL DEFAULT 5000;
ALTER TABLE "FundAllocation" ADD COLUMN "fixedCostsFixedMinor" BIGINT;
ALTER TABLE "FundAllocation" ADD COLUMN "savingsPercentBps" INTEGER NOT NULL DEFAULT 2000;
ALTER TABLE "FundAllocation" ADD COLUMN "savingsFixedMinor" BIGINT;
ALTER TABLE "FundAllocation" ADD COLUMN "investmentPercentBps" INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE "FundAllocation" ADD COLUMN "investmentFixedMinor" BIGINT;
ALTER TABLE "FundAllocation" ADD COLUMN "guiltFreeSpendingPercentBps" INTEGER NOT NULL DEFAULT 2000;
ALTER TABLE "FundAllocation" ADD COLUMN "guiltFreeSpendingFixedMinor" BIGINT;

UPDATE "FundAllocation" fa SET
  "fixedCostsPercentBps" = CASE
    WHEN fa."fixedCostsType" = 'percentage' THEN ROUND(fa."fixedCostsValue" * 100)::INTEGER
    ELSE fa."fixedCostsPercentBps"
  END,
  "fixedCostsFixedMinor" = CASE
    WHEN fa."fixedCostsType" = 'fixed' THEN ROUND(fa."fixedCostsValue" * "_csp_minor_factor"(u."displayCurrency"))::BIGINT
    ELSE NULL
  END,
  "savingsPercentBps" = CASE
    WHEN fa."savingsType" = 'percentage' THEN ROUND(fa."savingsValue" * 100)::INTEGER
    ELSE fa."savingsPercentBps"
  END,
  "savingsFixedMinor" = CASE
    WHEN fa."savingsType" = 'fixed' THEN ROUND(fa."savingsValue" * "_csp_minor_factor"(u."displayCurrency"))::BIGINT
    ELSE NULL
  END,
  "investmentPercentBps" = CASE
    WHEN fa."investmentType" = 'percentage' THEN ROUND(fa."investmentValue" * 100)::INTEGER
    ELSE fa."investmentPercentBps"
  END,
  "investmentFixedMinor" = CASE
    WHEN fa."investmentType" = 'fixed' THEN ROUND(fa."investmentValue" * "_csp_minor_factor"(u."displayCurrency"))::BIGINT
    ELSE NULL
  END,
  "guiltFreeSpendingPercentBps" = CASE
    WHEN fa."guiltFreeSpendingType" = 'percentage' THEN ROUND(fa."guiltFreeSpendingValue" * 100)::INTEGER
    ELSE fa."guiltFreeSpendingPercentBps"
  END,
  "guiltFreeSpendingFixedMinor" = CASE
    WHEN fa."guiltFreeSpendingType" = 'fixed' THEN ROUND(fa."guiltFreeSpendingValue" * "_csp_minor_factor"(u."displayCurrency"))::BIGINT
    ELSE NULL
  END
FROM "User" u
WHERE u."id" = fa."userId";

ALTER TABLE "FundAllocation" DROP COLUMN "fixedCostsValue";
ALTER TABLE "FundAllocation" DROP COLUMN "savingsValue";
ALTER TABLE "FundAllocation" DROP COLUMN "investmentValue";
ALTER TABLE "FundAllocation" DROP COLUMN "guiltFreeSpendingValue";

-- InvestmentHolding: float shares -> decimal
ALTER TABLE "InvestmentHolding"
  ALTER COLUMN "numberOfShares" TYPE DECIMAL(24, 8)
  USING "numberOfShares"::DECIMAL(24, 8);
