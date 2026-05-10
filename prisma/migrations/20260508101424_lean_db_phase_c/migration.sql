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

-- 1. Drop EmailDelivery.campaignId (0 readers, 0 writers). Guarded for fresh-DB chronology.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'EmailDelivery'
  ) THEN
    ALTER TABLE "EmailDelivery" DROP COLUMN IF EXISTS "campaignId";
  END IF;
END$$;

-- 2. Drop AiPayment.midtransPayload (0 readers, 0 writers).
--    On fresh DBs, AiPayment is created later by 20260511000000_add_ai_subscription_and_credits.
--    A deferred drop is appended to that migration so the column never persists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'AiPayment'
  ) THEN
    ALTER TABLE "AiPayment" DROP COLUMN IF EXISTS "midtransPayload";
  END IF;
END$$;

-- 3. Image polymorphism constraint: at most one owner FK per row.
--    Existing data check first — refuse if any row violates the rule.
DO $$
DECLARE
  bad_count BIGINT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Image'
  ) THEN
    RETURN;
  END IF;

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

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'image_one_owner') THEN
    ALTER TABLE "Image"
      ADD CONSTRAINT image_one_owner CHECK (
        (
          ("destinationId" IS NOT NULL)::int +
          ("packageId"     IS NOT NULL)::int +
          ("contentId"     IS NOT NULL)::int +
          ("locationId"    IS NOT NULL)::int
        ) <= 1
      );
  END IF;
END$$;

COMMIT;

-- ─── Rollback ──────────────────────────────────────────────────────────────
-- BEGIN;
-- ALTER TABLE "EmailDelivery" ADD COLUMN "campaignId" TEXT;
-- ALTER TABLE "AiPayment"     ADD COLUMN "midtransPayload" JSONB;
-- ALTER TABLE "Image"         DROP CONSTRAINT IF EXISTS image_one_owner;
-- COMMIT;
