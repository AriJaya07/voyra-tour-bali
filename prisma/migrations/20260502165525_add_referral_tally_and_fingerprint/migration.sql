-- AlterTable
ALTER TABLE "Referral" ADD COLUMN     "bookingsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "firstBookingAt" TIMESTAMP(3),
ADD COLUMN     "totalRewarded" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SignupFingerprint" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "ipHash" TEXT,
    "uaHash" TEXT,
    "phoneHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignupFingerprint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SignupFingerprint_userId_key" ON "SignupFingerprint"("userId");

-- CreateIndex
CREATE INDEX "SignupFingerprint_ipHash_idx" ON "SignupFingerprint"("ipHash");

-- CreateIndex
CREATE INDEX "SignupFingerprint_phoneHash_idx" ON "SignupFingerprint"("phoneHash");

-- CreateIndex
CREATE INDEX "SignupFingerprint_uaHash_createdAt_idx" ON "SignupFingerprint"("uaHash", "createdAt");

-- AddForeignKey
ALTER TABLE "SignupFingerprint" ADD CONSTRAINT "SignupFingerprint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
