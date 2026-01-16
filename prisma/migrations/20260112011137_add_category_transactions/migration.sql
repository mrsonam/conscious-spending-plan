-- CreateTable
CREATE TABLE "CategoryTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategoryTransaction_userId_idx" ON "CategoryTransaction"("userId");

-- CreateIndex
CREATE INDEX "CategoryTransaction_userId_category_month_year_idx" ON "CategoryTransaction"("userId", "category", "month", "year");

-- CreateIndex
CREATE INDEX "CategoryTransaction_userId_date_idx" ON "CategoryTransaction"("userId", "date");

-- AddForeignKey
ALTER TABLE "CategoryTransaction" ADD CONSTRAINT "CategoryTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
