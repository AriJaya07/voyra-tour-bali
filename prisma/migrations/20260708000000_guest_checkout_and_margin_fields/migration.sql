-- Guest checkout: Booking.userId becomes nullable (guest bookings carry leadEmail + ticketToken)
ALTER TABLE "Booking" ALTER COLUMN "userId" DROP NOT NULL;

-- Unit economics: net rate paid to operator, margin = price - costPrice
ALTER TABLE "Destination" ADD COLUMN IF NOT EXISTS "costPrice" DOUBLE PRECISION;
ALTER TABLE "Package" ADD COLUMN IF NOT EXISTS "costPrice" DOUBLE PRECISION;

-- Operator payout fields
ALTER TABLE "Operator" ADD COLUMN IF NOT EXISTS "commissionPercent" DOUBLE PRECISION;
ALTER TABLE "Operator" ADD COLUMN IF NOT EXISTS "payoutBankName" TEXT;
ALTER TABLE "Operator" ADD COLUMN IF NOT EXISTS "payoutAccountNo" TEXT;
ALTER TABLE "Operator" ADD COLUMN IF NOT EXISTS "payoutAccountName" TEXT;
ALTER TABLE "Operator" ADD COLUMN IF NOT EXISTS "payoutNotes" TEXT;
