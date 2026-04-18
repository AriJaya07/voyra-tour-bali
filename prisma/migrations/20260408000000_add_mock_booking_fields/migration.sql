-- Baseline: MockBooking table was created via db push before migration tracking.
-- Create it here (idempotently) so fresh databases and shadow DB validation work.

-- CreateTable: MockBooking (base columns, pre username/promoCode)
CREATE TABLE IF NOT EXISTS "MockBooking" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,
    "productImage" TEXT,
    "price" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "productOptionCode" TEXT,
    "productOptionTitle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MockBooking_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MockBooking_slug_key" ON "MockBooking"("slug");

-- AlterTable: MockBooking - add username and promoCode
ALTER TABLE "MockBooking" ADD COLUMN IF NOT EXISTS "username" TEXT;
ALTER TABLE "MockBooking" ADD COLUMN IF NOT EXISTS "promoCode" TEXT;

-- AlterTable: Booking - add isMockMode, manualPrice, promoCode, documentsJson
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "isMockMode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "manualPrice" DOUBLE PRECISION;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "promoCode" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "documentsJson" JSONB;
