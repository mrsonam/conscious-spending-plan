-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "expenseCategory" TEXT;

-- CreateIndex
CREATE INDEX "Expense_userId_expenseCategory_idx" ON "Expense"("userId", "expenseCategory");
