-- Lean DB Phase C — pending migration. NOT yet applied.
--
-- Purpose: drop dead columns and add Image polymorphism CHECK constraint.
-- Per agent-rules.md §5, schema migrations need explicit operator confirm.
--
-- Audit summary (verified by grep across app/, lib/, components/, utils/):
--   - EmailDelivery.campaignId   → 0 readers, 0 writers (passed through service
--                                   layer but never set by any caller). Tied to
--                                   the removed EmailCampaign model — see
--                                   agent/docs/architecture.md §10C.
--   - AiPayment.midtransPayload  → 0 readers, 0 writers anywhere in repo.
--   - Image polymorphism         → app contract is "exactly one owner" per
--                                   row; constraint missing today (tech-debt
--                                   §1.3).
--
-- ─── How to apply ──────────────────────────────────────────────────────────
-- 1. Take a Postgres snapshot or confirm PITR window.
-- 2. Edit prisma/schema.prisma to remove the two columns:
--      EmailDelivery.campaignId
--      AiPayment.midtransPayload
--    (Re-apply the diffs that this branch reverted in commit history.)
-- 3. Also remove the campaignId references in lib/services/emailService.ts
--    (parameter destructure + create payload).
-- 4. Run:  npx prisma migrate dev --create-only --name lean_db_phase_c
--    Replace the auto-generated SQL with this file's body (Prisma's default
--    drop won't include the CHECK constraint).
-- 5. Review the generated migration, then:  npx prisma migrate dev
-- 6. For prod:  npx prisma migrate deploy

BEGIN;

-- 1. Drop EmailDelivery.campaignId (0 readers, 0 writers).
ALTER TABLE "EmailDelivery" DROP COLUMN IF EXISTS "campaignId";

-- 2. Drop AiPayment.midtransPayload (0 readers, 0 writers).
ALTER TABLE "AiPayment" DROP COLUMN IF EXISTS "midtransPayload";

-- 3. Image polymorphism constraint: at most one owner FK per row.
--    Existing data check first — refuse if any row violates the rule.
DO $$
DECLARE
  bad_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO bad_count
  FROM "Image"
  WHERE (
    ("destinationId" IS NOT NULL)::int +
    ("packageId"     IS NOT NULL)::int +
    ("contentId"     IS NOT NULL)::int +
    ("locationId"    IS NOT NULL)::int
  ) > 1;

  IF bad_count > 0 THEN
    RAISE EXCEPTION
      'Refusing to add image_one_owner check: % rows violate the rule. Reconcile data first.',
      bad_count;
  END IF;
END$$;

ALTER TABLE "Image"
  ADD CONSTRAINT image_one_owner CHECK (
    (
      ("destinationId" IS NOT NULL)::int +
      ("packageId"     IS NOT NULL)::int +
      ("contentId"     IS NOT NULL)::int +
      ("locationId"    IS NOT NULL)::int
    ) <= 1
  );

COMMIT;

-- ─── Rollback ──────────────────────────────────────────────────────────────
-- BEGIN;
-- ALTER TABLE "EmailDelivery" ADD COLUMN "campaignId" TEXT;
-- ALTER TABLE "AiPayment"     ADD COLUMN "midtransPayload" JSONB;
-- ALTER TABLE "Image"         DROP CONSTRAINT IF EXISTS image_one_owner;
-- COMMIT;
