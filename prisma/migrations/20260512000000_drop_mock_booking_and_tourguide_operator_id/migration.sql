-- Drop MockBooking table (admin-only demo tool, zero rows in prod)
DROP TABLE IF EXISTS "MockBooking";

-- TourGuide.operatorId — column was never wired (no FK relation, no writers).
DROP INDEX IF EXISTS "TourGuide_operatorId_idx";
ALTER TABLE "TourGuide" DROP COLUMN IF EXISTS "operatorId";
