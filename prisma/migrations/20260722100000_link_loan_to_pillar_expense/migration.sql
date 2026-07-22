-- Link each outstanding Loan to the Expense that debits its fund pillar;
-- the Expense is removed when the loan is repaid.

ALTER TABLE "Loan" ADD COLUMN "expenseId" TEXT;

CREATE UNIQUE INDEX "Loan_expenseId_key" ON "Loan"("expenseId");

ALTER TABLE "Loan" ADD CONSTRAINT "Loan_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;
