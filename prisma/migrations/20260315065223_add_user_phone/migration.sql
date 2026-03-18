-- Baseline: changes applied via db push before migration tracking
-- Includes: Booking model, BookingStatus enum, User.phone, User.role default,
-- email verification fields, ticketToken

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'USER';

-- AlterTable: User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verificationToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tokenExpiry" TIMESTAMP(3);
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';

-- CreateTable: Booking
CREATE TABLE IF NOT EXISTS "Booking" (
    "id" SERIAL NOT NULL,
    "bookingRef" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "travelDate" TIMESTAMP(3) NOT NULL,
    "pax" INTEGER NOT NULL DEFAULT 1,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "paymentId" TEXT,
    "snapToken" TEXT,
    "paidAt" TIMESTAMP(3),
    "ticketToken" TEXT,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Booking_paymentId_key" ON "Booking"("paymentId");
CREATE UNIQUE INDEX IF NOT EXISTS "Booking_ticketToken_key" ON "Booking"("ticketToken");

-- AddForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "Booking_userId_fkey";
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
