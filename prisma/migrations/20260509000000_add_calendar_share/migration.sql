-- AlterTable
ALTER TABLE "User" ADD COLUMN     "calendarShareSlug" TEXT,
ADD COLUMN     "calendarShareEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "User_calendarShareSlug_key" ON "User"("calendarShareSlug");
