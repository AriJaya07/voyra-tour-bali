/*
  Warnings:

  - You are about to drop the column `isTrending` on the `Destination` table. All the data in the column will be lost.
  - You are about to drop the column `shortDesc` on the `Destination` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `Destination` table. All the data in the column will be lost.
  - You are about to drop the column `altText` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Package` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `Package` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Destination` table without a default value. This is not possible if the table is not empty.
  - Made the column `description` on table `Destination` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `title` to the `Package` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Package` table without a default value. This is not possible if the table is not empty.
  - Made the column `description` on table `Package` required. This step will fail if there are existing NULL values in that column.
  - Made the column `price` on table `Package` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "Destination_slug_key";

-- DropIndex
DROP INDEX "Package_slug_key";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Destination" DROP COLUMN "isTrending",
DROP COLUMN "shortDesc",
DROP COLUMN "slug",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "description" SET NOT NULL;

-- AlterTable
ALTER TABLE "Image" DROP COLUMN "altText",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Package" DROP COLUMN "name",
DROP COLUMN "slug",
ADD COLUMN     "destinationId" INTEGER,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "price" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE SET NULL ON UPDATE CASCADE;
