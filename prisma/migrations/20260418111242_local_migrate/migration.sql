/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "bookingQuestionsJson" JSONB,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'IDR',
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "isFraudFlagged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "languageGuide" TEXT,
ADD COLUMN     "leadEmail" TEXT,
ADD COLUMN     "leadFirstName" TEXT,
ADD COLUMN     "leadLastName" TEXT,
ADD COLUMN     "leadPhone" TEXT,
ADD COLUMN     "meetingPoint" TEXT,
ADD COLUMN     "paxMixJson" JSONB,
ADD COLUMN     "productImage" TEXT,
ADD COLUMN     "productOptionCode" TEXT,
ADD COLUMN     "productOptionTitle" TEXT,
ADD COLUMN     "startTime" TEXT,
ADD COLUMN     "ticketImageUrl" TEXT,
ADD COLUMN     "totalPriceUsd" DOUBLE PRECISION,
ADD COLUMN     "tourGradeCode" TEXT,
ADD COLUMN     "travelTime" TEXT,
ADD COLUMN     "travelersJson" JSONB,
ADD COLUMN     "viatorBookingError" TEXT,
ADD COLUMN     "viatorBookingRef" TEXT,
ADD COLUMN     "viatorBookingStatus" TEXT,
ADD COLUMN     "viatorRetryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "viatorVoucherUrl" TEXT,
ADD COLUMN     "voucherEmailed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'credentials',
ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3),
ALTER COLUMN "password" DROP NOT NULL;

-- CreateTable
CREATE TABLE "BookingTraveler" (
    "id" SERIAL NOT NULL,
    "bookingRef" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "ageBand" TEXT NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingTraveler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "source" TEXT NOT NULL DEFAULT 'WEBSITE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_email_key" ON "Subscription"("email");

-- CreateIndex
CREATE INDEX "Subscription_email_idx" ON "Subscription"("email");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_idempotencyKey_key" ON "Booking"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "BookingTraveler" ADD CONSTRAINT "BookingTraveler_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
