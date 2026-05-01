-- CreateEnum
CREATE TYPE "TourcmsBookingStatus" AS ENUM ('PENDING', 'PAYMENT', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "TourcmsBooking" (
    "id" SERIAL NOT NULL,
    "bookingRef" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "channelId" INTEGER NOT NULL,
    "productCode" TEXT NOT NULL,
    "productOptionCode" TEXT,
    "productTitle" TEXT NOT NULL,
    "productImage" TEXT,
    "currencySource" TEXT NOT NULL,
    "totalPriceSource" DOUBLE PRECISION NOT NULL,
    "fxRateToIdr" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "travelDate" TIMESTAMP(3) NOT NULL,
    "travelTime" TEXT,
    "meetingPoint" TEXT,
    "pax" INTEGER NOT NULL DEFAULT 1,
    "status" "TourcmsBookingStatus" NOT NULL DEFAULT 'PENDING',
    "leadFirstName" TEXT,
    "leadLastName" TEXT,
    "leadEmail" TEXT,
    "leadPhone" TEXT,
    "paxMixJson" JSONB,
    "bookingQuestionsJson" JSONB,
    "travelersJson" JSONB,
    "isFraudFlagged" BOOLEAN NOT NULL DEFAULT false,
    "voucherEmailed" BOOLEAN NOT NULL DEFAULT false,
    "paymentId" TEXT,
    "snapToken" TEXT,
    "paidAt" TIMESTAMP(3),
    "idempotencyKey" TEXT,
    "tourcmsHoldId" TEXT,
    "tourcmsBookingRef" TEXT,
    "tourcmsBookingStatus" TEXT,
    "tourcmsVoucherUrl" TEXT,
    "tourcmsCommitError" TEXT,
    "tourcmsRetryCount" INTEGER NOT NULL DEFAULT 0,
    "ticketToken" TEXT,
    "ticketImageUrl" TEXT,
    "paymentProofUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourcmsBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourcmsBookingTraveler" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "bookingRef" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "ageBand" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourcmsBookingTraveler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourcmsProductCache" (
    "productCode" TEXT NOT NULL,
    "channelId" INTEGER NOT NULL,
    "tourId" INTEGER NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourcmsProductCache_pkey" PRIMARY KEY ("productCode")
);

-- CreateIndex
CREATE UNIQUE INDEX "TourcmsBooking_bookingRef_key" ON "TourcmsBooking"("bookingRef");

-- CreateIndex
CREATE UNIQUE INDEX "TourcmsBooking_paymentId_key" ON "TourcmsBooking"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "TourcmsBooking_idempotencyKey_key" ON "TourcmsBooking"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "TourcmsBooking_ticketToken_key" ON "TourcmsBooking"("ticketToken");

-- CreateIndex
CREATE INDEX "TourcmsBooking_userId_idx" ON "TourcmsBooking"("userId");

-- CreateIndex
CREATE INDEX "TourcmsBooking_status_idx" ON "TourcmsBooking"("status");

-- CreateIndex
CREATE INDEX "TourcmsBooking_travelDate_idx" ON "TourcmsBooking"("travelDate");

-- CreateIndex
CREATE INDEX "TourcmsBookingTraveler_bookingId_idx" ON "TourcmsBookingTraveler"("bookingId");

-- CreateIndex
CREATE INDEX "TourcmsProductCache_expiresAt_idx" ON "TourcmsProductCache"("expiresAt");

-- AddForeignKey
ALTER TABLE "TourcmsBooking" ADD CONSTRAINT "TourcmsBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourcmsBookingTraveler" ADD CONSTRAINT "TourcmsBookingTraveler_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "TourcmsBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
