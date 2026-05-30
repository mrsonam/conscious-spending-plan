-- CreateTable
CREATE TABLE "CategoryBucketTransfer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromCategory" TEXT NOT NULL,
    "toCategory" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryBucketTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategoryBucketTransfer_userId_month_year_idx" ON "CategoryBucketTransfer"("userId", "month", "year");

-- CreateIndex
CREATE INDEX "CategoryBucketTransfer_userId_createdAt_idx" ON "CategoryBucketTransfer"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "CategoryBucketTransfer" ADD CONSTRAINT "CategoryBucketTransfer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
