-- Let a 'savings' category Expense record which SavingGoal it withdrew from,
-- and link the corresponding SavingGoalLedgerEntry back to that Expense.

ALTER TABLE "Expense" ADD COLUMN "savingGoalId" TEXT;

CREATE INDEX "Expense_savingGoalId_idx" ON "Expense"("savingGoalId");

ALTER TABLE "Expense" ADD CONSTRAINT "Expense_savingGoalId_fkey" FOREIGN KEY ("savingGoalId") REFERENCES "SavingGoal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SavingGoalLedgerEntry" ADD COLUMN "expenseId" TEXT;

CREATE UNIQUE INDEX "SavingGoalLedgerEntry_expenseId_key" ON "SavingGoalLedgerEntry"("expenseId");

CREATE INDEX "SavingGoalLedgerEntry_expenseId_idx" ON "SavingGoalLedgerEntry"("expenseId");

ALTER TABLE "SavingGoalLedgerEntry" ADD CONSTRAINT "SavingGoalLedgerEntry_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;
