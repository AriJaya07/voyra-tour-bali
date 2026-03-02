/*
  Warnings:

  - You are about to drop the column `image1` on the `Content` table. All the data in the column will be lost.
  - You are about to drop the column `image2` on the `Content` table. All the data in the column will be lost.
  - You are about to drop the column `image3` on the `Content` table. All the data in the column will be lost.
  - You are about to drop the column `image4` on the `Content` table. All the data in the column will be lost.
  - You are about to drop the column `image5` on the `Content` table. All the data in the column will be lost.
  - You are about to drop the column `imageMain` on the `Content` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `Location` table. All the data in the column will be lost.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[slug]` on the table `Destination` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `Package` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `key` to the `Image` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EDITOR');

-- DropForeignKey
ALTER TABLE "Image" DROP CONSTRAINT "Image_destinationId_fkey";

-- DropForeignKey
ALTER TABLE "Image" DROP CONSTRAINT "Image_packageId_fkey";

-- AlterTable
ALTER TABLE "Content" DROP COLUMN "image1",
DROP COLUMN "image2",
DROP COLUMN "image3",
DROP COLUMN "image4",
DROP COLUMN "image5",
DROP COLUMN "imageMain";

-- AlterTable
ALTER TABLE "Destination" ADD COLUMN     "slug" TEXT;

-- AlterTable
ALTER TABLE "Image" ADD COLUMN     "altText" TEXT,
ADD COLUMN     "contentId" INTEGER,
ADD COLUMN     "isMain" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "key" TEXT NOT NULL,
ADD COLUMN     "locationId" INTEGER,
ADD COLUMN     "order" INTEGER;

-- AlterTable
ALTER TABLE "Location" DROP COLUMN "image";

-- AlterTable
ALTER TABLE "Package" ADD COLUMN     "slug" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'ADMIN';

-- CreateIndex
CREATE UNIQUE INDEX "Destination_slug_key" ON "Destination"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Package_slug_key" ON "Package"("slug");

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
