-- AlterTable
ALTER TABLE "Transfer" ADD COLUMN     "category" TEXT;

-- CreateIndex
CREATE INDEX "Transfer_userId_category_idx" ON "Transfer"("userId", "category");
