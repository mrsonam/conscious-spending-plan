-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "defaultAccountId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundAllocation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fixedCostsType" TEXT NOT NULL DEFAULT 'percentage',
    "fixedCostsValue" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "fixedCostsCap" DOUBLE PRECISION,
    "savingsType" TEXT NOT NULL DEFAULT 'percentage',
    "savingsValue" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "savingsCap" DOUBLE PRECISION,
    "investmentType" TEXT NOT NULL DEFAULT 'percentage',
    "investmentValue" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "investmentCap" DOUBLE PRECISION,
    "guiltFreeSpendingType" TEXT NOT NULL DEFAULT 'percentage',
    "guiltFreeSpendingValue" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "guiltFreeSpendingCap" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomeEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncomeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startingFunds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromAccountId" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryBalance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FundAllocation_userId_key" ON "FundAllocation"("userId");

-- CreateIndex
CREATE INDEX "IncomeEntry_userId_idx" ON "IncomeEntry"("userId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Transfer_userId_idx" ON "Transfer"("userId");

-- CreateIndex
CREATE INDEX "Transfer_fromAccountId_idx" ON "Transfer"("fromAccountId");

-- CreateIndex
CREATE INDEX "Transfer_toAccountId_idx" ON "Transfer"("toAccountId");

-- CreateIndex
CREATE INDEX "CategoryBalance_userId_idx" ON "CategoryBalance"("userId");

-- CreateIndex
CREATE INDEX "CategoryBalance_userId_month_year_idx" ON "CategoryBalance"("userId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryBalance_userId_category_month_year_key" ON "CategoryBalance"("userId", "category", "month", "year");

-- CreateIndex
CREATE INDEX "Expense_userId_idx" ON "Expense"("userId");

-- CreateIndex
CREATE INDEX "Expense_accountId_idx" ON "Expense"("accountId");

-- CreateIndex
CREATE INDEX "Expense_userId_date_idx" ON "Expense"("userId", "date");

-- AddForeignKey
ALTER TABLE "FundAllocation" ADD CONSTRAINT "FundAllocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeEntry" ADD CONSTRAINT "IncomeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryBalance" ADD CONSTRAINT "CategoryBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
