-- Convert monetary DOUBLE PRECISION columns to BIGINT minor units (per-user displayCurrency).

CREATE OR REPLACE FUNCTION "_csp_minor_factor"(currency TEXT) RETURNS INTEGER AS $$
BEGIN
  IF currency = 'JPY' THEN RETURN 1; END IF;
  RETURN 100;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- FundAllocation caps
ALTER TABLE "FundAllocation" ADD COLUMN IF NOT EXISTS "_fixedCostsCap_minor" BIGINT;
UPDATE "FundAllocation" fa SET "_fixedCostsCap_minor" = ROUND(fa."fixedCostsCap" * "_csp_minor_factor"(u."displayCurrency"))::BIGINT
FROM "User" u WHERE u."id" = fa."userId" AND fa."fixedCostsCap" IS NOT NULL;
ALTER TABLE "FundAllocation" DROP COLUMN "fixedCostsCap";
ALTER TABLE "FundAllocation" RENAME COLUMN "_fixedCostsCap_minor" TO "fixedCostsCap";

ALTER TABLE "FundAllocation" ADD COLUMN IF NOT EXISTS "_savingsCap_minor" BIGINT;
UPDATE "FundAllocation" fa SET "_savingsCap_minor" = ROUND(fa."savingsCap" * "_csp_minor_factor"(u."displayCurrency"))::BIGINT
FROM "User" u WHERE u."id" = fa."userId" AND fa."savingsCap" IS NOT NULL;
ALTER TABLE "FundAllocation" DROP COLUMN "savingsCap";
ALTER TABLE "FundAllocation" RENAME COLUMN "_savingsCap_minor" TO "savingsCap";

ALTER TABLE "FundAllocation" ADD COLUMN IF NOT EXISTS "_investmentCap_minor" BIGINT;
UPDATE "FundAllocation" fa SET "_investmentCap_minor" = ROUND(fa."investmentCap" * "_csp_minor_factor"(u."displayCurrency"))::BIGINT
FROM "User" u WHERE u."id" = fa."userId" AND fa."investmentCap" IS NOT NULL;
ALTER TABLE "FundAllocation" DROP COLUMN "investmentCap";
ALTER TABLE "FundAllocation" RENAME COLUMN "_investmentCap_minor" TO "investmentCap";

ALTER TABLE "FundAllocation" ADD COLUMN IF NOT EXISTS "_guiltFreeSpendingCap_minor" BIGINT;
UPDATE "FundAllocation" fa SET "_guiltFreeSpendingCap_minor" = ROUND(fa."guiltFreeSpendingCap" * "_csp_minor_factor"(u."displayCurrency"))::BIGINT
FROM "User" u WHERE u."id" = fa."userId" AND fa."guiltFreeSpendingCap" IS NOT NULL;
ALTER TABLE "FundAllocation" DROP COLUMN "guiltFreeSpendingCap";
ALTER TABLE "FundAllocation" RENAME COLUMN "_guiltFreeSpendingCap_minor" TO "guiltFreeSpendingCap";

-- Account
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "_balance_minor" BIGINT NOT NULL DEFAULT 0;
UPDATE "Account" a SET "_balance_minor" = ROUND(COALESCE(a."balance", 0) * "_csp_minor_factor"(u."displayCurrency"))::BIGINT
FROM "User" u WHERE u."id" = a."userId";
ALTER TABLE "Account" DROP COLUMN "balance";
ALTER TABLE "Account" RENAME COLUMN "_balance_minor" TO "balance";
ALTER TABLE "Account" ALTER COLUMN "balance" SET DEFAULT 0;

ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "_startingFunds_minor" BIGINT NOT NULL DEFAULT 0;
UPDATE "Account" a SET "_startingFunds_minor" = ROUND(COALESCE(a."startingFunds", 0) * "_csp_minor_factor"(u."displayCurrency"))::BIGINT
FROM "User" u WHERE u."id" = a."userId";
ALTER TABLE "Account" DROP COLUMN "startingFunds";
ALTER TABLE "Account" RENAME COLUMN "_startingFunds_minor" TO "startingFunds";
ALTER TABLE "Account" ALTER COLUMN "startingFunds" SET DEFAULT 0;

-- IncomeEntry
ALTER TABLE "IncomeEntry" ADD COLUMN IF NOT EXISTS "_amount_minor" BIGINT;
UPDATE "IncomeEntry" ie SET "_amount_minor" = ROUND(COALESCE(ie."amount", 0) * "_csp_minor_factor"(u."displayCurrency"))::BIGINT
FROM "User" u WHERE u."id" = ie."userId";
ALTER TABLE "IncomeEntry" DROP COLUMN "amount";
ALTER TABLE "IncomeEntry" RENAME COLUMN "_amount_minor" TO "amount";
ALTER TABLE "IncomeEntry" ALTER COLUMN "amount" SET NOT NULL;

ALTER TABLE "IncomeEntry" ADD COLUMN IF NOT EXISTS "_allocationFixedCosts_minor" BIGINT;
UPDATE "IncomeEntry" ie SET "_allocationFixedCosts_minor" = ROUND(ie."allocationFixedCosts" * "_csp_minor_factor"(u."displayCurrency"))::BIGINT
FROM "User" u WHERE u."id" = ie."userId" AND ie."allocationFixedCosts" IS NOT NULL;
ALTER TABLE "IncomeEntry" DROP COLUMN "allocationFixedCosts";
ALTER TABLE "IncomeEntry" RENAME COLUMN "_allocationFixedCosts_minor" TO "allocationFixedCosts";

ALTER TABLE "IncomeEntry" ADD COLUMN IF NOT EXISTS "_allocationSavings_minor" BIGINT;
UPDATE "IncomeEntry" ie SET "_allocationSavings_minor" = ROUND(ie."allocationSavings" * "_csp_minor_factor"(u."displayCurrency"))::BIGINT
FROM "User" u WHERE u."id" = ie."userId" AND ie."allocationSavings" IS NOT NULL;
ALTER TABLE "IncomeEntry" DROP COLUMN "allocationSavings";
ALTER TABLE "IncomeEntry" RENAME COLUMN "_allocationSavings_minor" TO "allocationSavings";

ALTER TABLE "IncomeEntry" ADD COLUMN IF NOT EXISTS "_allocationInvestment_minor" BIGINT;
UPDATE "IncomeEntry" ie SET "_allocationInvestment_minor" = ROUND(ie."allocationInvestment" * "_csp_minor_factor"(u."displayCurrency"))::BIGINT
FROM "User" u WHERE u."id" = ie."userId" AND ie."allocationInvestment" IS NOT NULL;
ALTER TABLE "IncomeEntry" DROP COLUMN "allocationInvestment";
ALTER TABLE "IncomeEntry" RENAME COLUMN "_allocationInvestment_minor" TO "allocationInvestment";

ALTER TABLE "IncomeEntry" ADD COLUMN IF NOT EXISTS "_allocationGuiltFreeSpending_minor" BIGINT;
UPDATE "IncomeEntry" ie SET "_allocationGuiltFreeSpending_minor" = ROUND(ie."allocationGuiltFreeSpending" * "_csp_minor_factor"(u."displayCurrency"))::BIGINT
FROM "User" u WHERE u."id" = ie."userId" AND ie."allocationGuiltFreeSpending" IS NOT NULL;
ALTER TABLE "IncomeEntry" DROP COLUMN "allocationGuiltFreeSpending";
ALTER TABLE "IncomeEntry" RENAME COLUMN "_allocationGuiltFreeSpending_minor" TO "allocationGuiltFreeSpending";

-- Transfer
ALTER TABLE "Transfer" ADD COLUMN IF NOT EXISTS "_amount_minor" BIGINT;
UPDATE "Transfer" t SET "_amount_minor" = ROUND(COALESCE(t."amount", 0) * "_csp_minor_factor"(u."displayCurrency"))::BIGINT
FROM "User" u WHERE u."id" = t."userId";
ALTER TABLE "Transfer" DROP COLUMN "amount";
ALTER TABLE "Transfer" RENAME COLUMN "_amount_minor" TO "amount";
ALTER TABLE "Transfer" ALTER COLUMN "amount" SET NOT NULL;

-- CategoryBalance
ALTER TABLE "CategoryBalance" ADD COLUMN IF NOT EXISTS "_balance_minor" BIGINT NOT NULL DEFAULT 0;
UPDATE "CategoryBalance" cb SET "_balance_minor" = ROUND(COALESCE(cb."balance", 0) * "_csp_minor_factor"(u."displayCurrency"))::BIGINT
FROM "User" u WHERE u."id" = cb."userId";
ALTER TABLE "CategoryBalance" DROP COLUMN "balance";
ALTER TABLE "CategoryBalance" RENAME COLUMN "_balance_minor" TO "balance";
ALTER TABLE "CategoryBalance" ALTER COLUMN "balance" SET DEFAULT 0;

-- CategoryMonthClosing
ALTER TABLE "CategoryMonthClosing" ADD COLUMN IF NOT EXISTS "_remaining_minor" BIGINT NOT NULL DEFAULT 0;
UPDATE "CategoryMonthClosing" c SET "_remaining_minor" = ROUND(COALESCE(c."remaining", 0) * "_csp_minor_factor"(u."displayCurrency"))::BIGINT
FROM "User" u WHERE u."id" = c."userId";
ALTER TABLE "CategoryMonthClosing" DROP COLUMN "remaining";
ALTER TABLE "CategoryMonthClosing" RENAME COLUMN "_remaining_minor" TO "remaining";
ALTER TABLE "CategoryMonthClosing" ALTER COLUMN "remaining" SET DEFAULT 0;

ALTER TABLE "CategoryMonthClosing" ADD COLUMN IF NOT EXISTS "_overspent_minor" BIGINT NOT NULL DEFAULT 0;
UPDATE "CategoryMonthClosing" c SET "_overspent_minor" = ROUND(COALESCE(c."overspent", 0) * "_csp_minor_factor"(u."displayCurrency"))::BIGINT
FROM "User" u WHERE u."id" = c."userId";
ALTER TABLE "CategoryMonthClosing" DROP COLUMN "overspent";
ALTER TABLE "CategoryMonthClosing" RENAME COLUMN "_overspent_minor" TO "overspent";
ALTER TABLE "CategoryMonthClosing" ALTER COLUMN "overspent" SET DEFAULT 0;

-- Expense
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "_amount_minor" BIGINT;
UPDATE "Expense" e SET "_amount_minor" = ROUND(COALESCE(e."amount", 0) * "_csp_minor_factor"(u."displayCurrency"))::BIGINT
FROM "User" u WHERE u."id" = e."userId";
ALTER TABLE "Expense" DROP COLUMN "amount";
ALTER TABLE "Expense" RENAME COLUMN "_amount_minor" TO "amount";
ALTER TABLE "Expense" ALTER COLUMN "amount" SET NOT NULL;

-- RecurringExpense
ALTER TABLE "RecurringExpense" ADD COLUMN IF NOT EXISTS "_amount_minor" BIGINT;
UPDATE "RecurringExpense" re SET "_amount_minor" = ROUND(COALESCE(re."amount", 0) * "_csp_minor_factor"(u."displayCurrency"))::BIGINT
FROM "User" u WHERE u."id" = re."userId";
ALTER TABLE "RecurringExpense" DROP COLUMN "amount";
ALTER TABLE "RecurringExpense" RENAME COLUMN "_amount_minor" TO "amount";
ALTER TABLE "RecurringExpense" ALTER COLUMN "amount" SET NOT NULL;

-- Subscription foreignAmount
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "_foreignAmount_minor" BIGINT;
UPDATE "Subscription" s SET "_foreignAmount_minor" = ROUND(s."foreignAmount" * "_csp_minor_factor"(COALESCE(s."foreignCurrency", u."displayCurrency")))::BIGINT
FROM "User" u WHERE u."id" = s."userId" AND s."foreignAmount" IS NOT NULL;
ALTER TABLE "Subscription" DROP COLUMN "foreignAmount";
ALTER TABLE "Subscription" RENAME COLUMN "_foreignAmount_minor" TO "foreignAmount";

-- CategoryTransaction
ALTER TABLE "CategoryTransaction" ADD COLUMN IF NOT EXISTS "_amount_minor" BIGINT;
UPDATE "CategoryTransaction" ct SET "_amount_minor" = ROUND(COALESCE(ct."amount", 0) * "_csp_minor_factor"(u."displayCurrency"))::BIGINT
FROM "User" u WHERE u."id" = ct."userId";
ALTER TABLE "CategoryTransaction" DROP COLUMN "amount";
ALTER TABLE "CategoryTransaction" RENAME COLUMN "_amount_minor" TO "amount";
ALTER TABLE "CategoryTransaction" ALTER COLUMN "amount" SET NOT NULL;

-- InvestmentHolding
ALTER TABLE "InvestmentHolding" ADD COLUMN IF NOT EXISTS "_amount_minor" BIGINT;
UPDATE "InvestmentHolding" ih SET "_amount_minor" = ROUND(COALESCE(ih."amount", 0) * "_csp_minor_factor"(u."displayCurrency"))::BIGINT
FROM "User" u WHERE u."id" = ih."userId";
ALTER TABLE "InvestmentHolding" DROP COLUMN "amount";
ALTER TABLE "InvestmentHolding" RENAME COLUMN "_amount_minor" TO "amount";
ALTER TABLE "InvestmentHolding" ALTER COLUMN "amount" SET NOT NULL;

ALTER TABLE "InvestmentHolding" ADD COLUMN IF NOT EXISTS "_pricePerUnit_minor" BIGINT;
UPDATE "InvestmentHolding" ih SET "_pricePerUnit_minor" = ROUND(ih."pricePerUnit" * "_csp_minor_factor"(u."displayCurrency"))::BIGINT
FROM "User" u WHERE u."id" = ih."userId" AND ih."pricePerUnit" IS NOT NULL;
ALTER TABLE "InvestmentHolding" DROP COLUMN "pricePerUnit";
ALTER TABLE "InvestmentHolding" RENAME COLUMN "_pricePerUnit_minor" TO "pricePerUnit";

ALTER TABLE "InvestmentHolding" ADD COLUMN IF NOT EXISTS "_brokerageFee_minor" BIGINT;
UPDATE "InvestmentHolding" ih SET "_brokerageFee_minor" = ROUND(ih."brokerageFee" * "_csp_minor_factor"(u."displayCurrency"))::BIGINT
FROM "User" u WHERE u."id" = ih."userId" AND ih."brokerageFee" IS NOT NULL;
ALTER TABLE "InvestmentHolding" DROP COLUMN "brokerageFee";
ALTER TABLE "InvestmentHolding" RENAME COLUMN "_brokerageFee_minor" TO "brokerageFee";

-- InvestmentDividend
ALTER TABLE "InvestmentDividend" ADD COLUMN IF NOT EXISTS "_amount_minor" BIGINT;
UPDATE "InvestmentDividend" idv SET "_amount_minor" = ROUND(COALESCE(idv."amount", 0) * "_csp_minor_factor"(u."displayCurrency"))::BIGINT
FROM "User" u WHERE u."id" = idv."userId";
ALTER TABLE "InvestmentDividend" DROP COLUMN "amount";
ALTER TABLE "InvestmentDividend" RENAME COLUMN "_amount_minor" TO "amount";
ALTER TABLE "InvestmentDividend" ALTER COLUMN "amount" SET NOT NULL;

-- Loan
ALTER TABLE "Loan" ADD COLUMN IF NOT EXISTS "_amount_minor" BIGINT;
UPDATE "Loan" l SET "_amount_minor" = ROUND(COALESCE(l."amount", 0) * "_csp_minor_factor"(u."displayCurrency"))::BIGINT
FROM "User" u WHERE u."id" = l."userId";
ALTER TABLE "Loan" DROP COLUMN "amount";
ALTER TABLE "Loan" RENAME COLUMN "_amount_minor" TO "amount";
ALTER TABLE "Loan" ALTER COLUMN "amount" SET NOT NULL;

ALTER TABLE "Loan" ADD COLUMN IF NOT EXISTS "_repaidAmount_minor" BIGINT NOT NULL DEFAULT 0;
UPDATE "Loan" l SET "_repaidAmount_minor" = ROUND(COALESCE(l."repaidAmount", 0) * "_csp_minor_factor"(u."displayCurrency"))::BIGINT
FROM "User" u WHERE u."id" = l."userId";
ALTER TABLE "Loan" DROP COLUMN "repaidAmount";
ALTER TABLE "Loan" RENAME COLUMN "_repaidAmount_minor" TO "repaidAmount";
ALTER TABLE "Loan" ALTER COLUMN "repaidAmount" SET DEFAULT 0;

-- BorrowedLoan
ALTER TABLE "BorrowedLoan" ADD COLUMN IF NOT EXISTS "_amount_minor" BIGINT;
UPDATE "BorrowedLoan" bl SET "_amount_minor" = ROUND(COALESCE(bl."amount", 0) * "_csp_minor_factor"(u."displayCurrency"))::BIGINT
FROM "User" u WHERE u."id" = bl."userId";
ALTER TABLE "BorrowedLoan" DROP COLUMN "amount";
ALTER TABLE "BorrowedLoan" RENAME COLUMN "_amount_minor" TO "amount";
ALTER TABLE "BorrowedLoan" ALTER COLUMN "amount" SET NOT NULL;

ALTER TABLE "BorrowedLoan" ADD COLUMN IF NOT EXISTS "_repaidAmount_minor" BIGINT NOT NULL DEFAULT 0;
UPDATE "BorrowedLoan" bl SET "_repaidAmount_minor" = ROUND(COALESCE(bl."repaidAmount", 0) * "_csp_minor_factor"(u."displayCurrency"))::BIGINT
FROM "User" u WHERE u."id" = bl."userId";
ALTER TABLE "BorrowedLoan" DROP COLUMN "repaidAmount";
ALTER TABLE "BorrowedLoan" RENAME COLUMN "_repaidAmount_minor" TO "repaidAmount";
ALTER TABLE "BorrowedLoan" ALTER COLUMN "repaidAmount" SET DEFAULT 0;

DROP FUNCTION "_csp_minor_factor"(TEXT);
