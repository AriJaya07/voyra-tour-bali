ALTER TABLE "Booking" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'viator';

-- Backfill: rows that look local (no Viator product-option-code, no Viator booking ref ever set)
-- get marked as local. Conservative — leave most as viator default.
UPDATE "Booking"
SET "source" = 'local'
WHERE "productOptionCode" IS NULL
  AND "viatorBookingRef" IS NULL
  AND "viatorBookingStatus" IS NULL
  AND ("productCode" LIKE 'LOCAL-%' OR "productCode" NOT LIKE '%-%-%');
