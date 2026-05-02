-- CreateTable
CREATE TABLE "AiSubscription" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "lastRenewalAt" TIMESTAMP(3),
    "nextRenewalAt" TIMESTAMP(3),
    "failedRenewals" INTEGER NOT NULL DEFAULT 0,
    "priceIdr" INTEGER NOT NULL,
    "monthlyCredits" INTEGER NOT NULL,
    "carryoverDays" INTEGER NOT NULL,
    "carryoverCap" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiCreditWallet" (
    "userId" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "lifetimeEarned" INTEGER NOT NULL DEFAULT 0,
    "lifetimeSpent" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiCreditWallet_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "AiCreditGrant" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "remaining" INTEGER NOT NULL,
    "refId" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "expiredAt" TIMESTAMP(3),

    CONSTRAINT "AiCreditGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiCreditLedger" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "refId" TEXT,
    "meta" JSONB,
    "reservationStatus" TEXT,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiCreditLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsage" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "ipHash" TEXT,
    "endpoint" TEXT NOT NULL,
    "creditsCost" INTEGER NOT NULL,
    "tokensIn" INTEGER,
    "tokensOut" INTEGER,
    "model" TEXT,
    "durationMs" INTEGER,
    "status" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiPayment" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "plan" TEXT,
    "pack" TEXT,
    "creditsToGrant" INTEGER NOT NULL,
    "amountIdr" INTEGER NOT NULL,
    "paymentId" TEXT NOT NULL,
    "snapToken" TEXT,
    "status" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "midtransPayload" JSONB,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiSubscription_userId_key" ON "AiSubscription"("userId");

-- CreateIndex
CREATE INDEX "AiSubscription_status_currentPeriodEnd_idx" ON "AiSubscription"("status", "currentPeriodEnd");

-- CreateIndex
CREATE INDEX "AiCreditGrant_userId_expiresAt_idx" ON "AiCreditGrant"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "AiCreditGrant_userId_remaining_idx" ON "AiCreditGrant"("userId", "remaining");

-- CreateIndex
CREATE INDEX "AiCreditLedger_userId_createdAt_idx" ON "AiCreditLedger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiCreditLedger_reservationStatus_idx" ON "AiCreditLedger"("reservationStatus");

-- CreateIndex
CREATE INDEX "AiUsage_userId_createdAt_idx" ON "AiUsage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsage_ipHash_createdAt_idx" ON "AiUsage"("ipHash", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsage_endpoint_status_createdAt_idx" ON "AiUsage"("endpoint", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiPayment_paymentId_key" ON "AiPayment"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "AiPayment_idempotencyKey_key" ON "AiPayment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AiPayment_userId_status_idx" ON "AiPayment"("userId", "status");

-- AddForeignKey
ALTER TABLE "AiSubscription" ADD CONSTRAINT "AiSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiCreditWallet" ADD CONSTRAINT "AiCreditWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiCreditGrant" ADD CONSTRAINT "AiCreditGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiCreditLedger" ADD CONSTRAINT "AiCreditLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiPayment" ADD CONSTRAINT "AiPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
