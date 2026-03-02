-- CreateTable
CREATE TABLE "CategoryMonthClosing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "remaining" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overspent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryMonthClosing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoryMonthClosing_userId_category_month_year_key" ON "CategoryMonthClosing"("userId", "category", "month", "year");

-- CreateIndex
CREATE INDEX "CategoryMonthClosing_userId_idx" ON "CategoryMonthClosing"("userId");

-- CreateIndex
CREATE INDEX "CategoryMonthClosing_userId_month_year_idx" ON "CategoryMonthClosing"("userId", "month", "year");

-- AddForeignKey
ALTER TABLE "CategoryMonthClosing" ADD CONSTRAINT "CategoryMonthClosing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
