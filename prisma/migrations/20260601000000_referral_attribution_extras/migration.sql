-- Referral attribution + idempotency + analytics columns
ALTER TABLE "User" ADD COLUMN "referredById" INTEGER;
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "User_referredById_idx" ON "User"("referredById");

ALTER TABLE "Referral" ADD COLUMN "firstSignupBonusGivenAt" TIMESTAMP(3);
ALTER TABLE "Referral" ADD COLUMN "attributionSource" TEXT;
ALTER TABLE "Referral" ADD COLUMN "lastSharedAt" TIMESTAMP(3);
ALTER TABLE "Referral" ADD COLUMN "suspiciousReason" TEXT;

CREATE INDEX "Referral_inviteeId_idx" ON "Referral"("inviteeId");
