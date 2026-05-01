-- AlterTable
ALTER TABLE "User" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'IDR';

-- CreateTable
CREATE TABLE "RecentlyViewedItem" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "productCode" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT,
    "price" DOUBLE PRECISION,
    "currency" TEXT,
    "href" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecentlyViewedItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecentlyViewedItem_userId_productCode_source_key" ON "RecentlyViewedItem"("userId", "productCode", "source");

-- CreateIndex
CREATE INDEX "RecentlyViewedItem_userId_idx" ON "RecentlyViewedItem"("userId");

-- CreateIndex
CREATE INDEX "RecentlyViewedItem_userId_viewedAt_idx" ON "RecentlyViewedItem"("userId", "viewedAt");

-- AddForeignKey
ALTER TABLE "RecentlyViewedItem" ADD CONSTRAINT "RecentlyViewedItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
