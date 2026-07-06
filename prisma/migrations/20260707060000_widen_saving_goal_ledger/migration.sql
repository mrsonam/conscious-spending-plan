-- Widen the saving-goal credit ledger into a general signed transaction log.
-- This is a hand-written RENAME (not a drop+create): existing ledger rows,
-- and every constraint/index on them, are preserved. `prisma migrate diff`
-- cannot distinguish a rename from a drop+create for a renamed table, so
-- this migration is authored by hand to guarantee no data loss.

ALTER TABLE "SavingGoalCredit" RENAME TO "SavingGoalLedgerEntry";

ALTER TABLE "SavingGoalLedgerEntry" RENAME CONSTRAINT "SavingGoalCredit_pkey" TO "SavingGoalLedgerEntry_pkey";
ALTER TABLE "SavingGoalLedgerEntry" RENAME CONSTRAINT "SavingGoalCredit_incomeEntryId_fkey" TO "SavingGoalLedgerEntry_incomeEntryId_fkey";
ALTER TABLE "SavingGoalLedgerEntry" RENAME CONSTRAINT "SavingGoalCredit_savingGoalId_fkey" TO "SavingGoalLedgerEntry_savingGoalId_fkey";
ALTER TABLE "SavingGoalLedgerEntry" RENAME CONSTRAINT "SavingGoalCredit_userId_fkey" TO "SavingGoalLedgerEntry_userId_fkey";

ALTER INDEX "SavingGoalCredit_incomeEntryId_idx" RENAME TO "SavingGoalLedgerEntry_incomeEntryId_idx";
ALTER INDEX "SavingGoalCredit_savingGoalId_incomeEntryId_key" RENAME TO "SavingGoalLedgerEntry_savingGoalId_incomeEntryId_key";
ALTER INDEX "SavingGoalCredit_userId_idx" RENAME TO "SavingGoalLedgerEntry_userId_idx";

-- AlterTable
ALTER TABLE "SavingGoalLedgerEntry" ALTER COLUMN "incomeEntryId" DROP NOT NULL;
ALTER TABLE "SavingGoalLedgerEntry" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'income';
