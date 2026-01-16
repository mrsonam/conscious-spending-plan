-- CreateTable
CREATE TABLE "InvestmentHolding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestmentHolding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvestmentHolding_userId_idx" ON "InvestmentHolding"("userId");

-- CreateIndex
CREATE INDEX "InvestmentHolding_accountId_idx" ON "InvestmentHolding"("accountId");

-- AddForeignKey
ALTER TABLE "InvestmentHolding" ADD CONSTRAINT "InvestmentHolding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentHolding" ADD CONSTRAINT "InvestmentHolding_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
