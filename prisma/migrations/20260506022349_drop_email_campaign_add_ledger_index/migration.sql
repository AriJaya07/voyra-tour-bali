/*
  Warnings:

  - You are about to drop the `EmailCampaign` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE IF EXISTS "EmailCampaign";

-- CreateIndex (conditional: AiCreditLedger created in later migration on fresh DBs)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'AiCreditLedger') THEN
    CREATE INDEX IF NOT EXISTS "AiCreditLedger_reservationStatus_settledAt_idx" ON "AiCreditLedger"("reservationStatus", "settledAt");
  END IF;
END $$;
