-- CreateTable
CREATE TABLE "SavingGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetMinor" BIGINT NOT NULL,
    "currentMinor" BIGINT NOT NULL DEFAULT 0,
    "percentBps" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavingGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavingGoalCredit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "savingGoalId" TEXT NOT NULL,
    "incomeEntryId" TEXT NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavingGoalCredit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavingGoal_userId_status_idx" ON "SavingGoal"("userId", "status");

-- CreateIndex
CREATE INDEX "SavingGoalCredit_userId_idx" ON "SavingGoalCredit"("userId");

-- CreateIndex
CREATE INDEX "SavingGoalCredit_incomeEntryId_idx" ON "SavingGoalCredit"("incomeEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "SavingGoalCredit_savingGoalId_incomeEntryId_key" ON "SavingGoalCredit"("savingGoalId", "incomeEntryId");

-- AddForeignKey
ALTER TABLE "SavingGoal" ADD CONSTRAINT "SavingGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingGoalCredit" ADD CONSTRAINT "SavingGoalCredit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingGoalCredit" ADD CONSTRAINT "SavingGoalCredit_savingGoalId_fkey" FOREIGN KEY ("savingGoalId") REFERENCES "SavingGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingGoalCredit" ADD CONSTRAINT "SavingGoalCredit_incomeEntryId_fkey" FOREIGN KEY ("incomeEntryId") REFERENCES "IncomeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
