-- AlterTable: MockBooking - add username and promoCode
ALTER TABLE "MockBooking" ADD COLUMN "username" TEXT;
ALTER TABLE "MockBooking" ADD COLUMN "promoCode" TEXT;

-- AlterTable: Booking - add isMockMode, manualPrice, promoCode, documentsJson
ALTER TABLE "Booking" ADD COLUMN "isMockMode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Booking" ADD COLUMN "manualPrice" DOUBLE PRECISION;
ALTER TABLE "Booking" ADD COLUMN "promoCode" TEXT;
ALTER TABLE "Booking" ADD COLUMN "documentsJson" JSONB;
