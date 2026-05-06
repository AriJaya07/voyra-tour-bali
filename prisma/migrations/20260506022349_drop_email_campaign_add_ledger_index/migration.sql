/*
  Warnings:

  - You are about to drop the `EmailCampaign` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "EmailCampaign";

-- CreateIndex
CREATE INDEX "AiCreditLedger_reservationStatus_settledAt_idx" ON "AiCreditLedger"("reservationStatus", "settledAt");
