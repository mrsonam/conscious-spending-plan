-- CreateTable
CREATE TABLE "InvestmentDividend" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestmentDividend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvestmentDividend_userId_idx" ON "InvestmentDividend"("userId");

-- CreateIndex
CREATE INDEX "InvestmentDividend_accountId_idx" ON "InvestmentDividend"("accountId");

-- CreateIndex
CREATE INDEX "InvestmentDividend_userId_name_idx" ON "InvestmentDividend"("userId", "name");

-- AddForeignKey
ALTER TABLE "InvestmentDividend" ADD CONSTRAINT "InvestmentDividend_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentDividend" ADD CONSTRAINT "InvestmentDividend_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
