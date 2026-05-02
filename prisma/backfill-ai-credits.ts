/**
 * Phase-1 backfill: grant 500 AI credits to every existing user, valid 365 days.
 *
 * Idempotent: re-running is safe (refId BACKFILL_PHASE1_<userId> deduplicates).
 *
 * Run:
 *   npx tsx prisma/backfill-ai-credits.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const AMOUNT = 500;
const TTL_DAYS = 365;

async function main() {
  const users = await prisma.user.findMany({ select: { id: true } });
  console.log(`[backfill] ${users.length} users found`);

  let granted = 0;
  let skipped = 0;

  for (const u of users) {
    const refId = `BACKFILL_PHASE1_${u.id}`;
    const existing = await prisma.aiCreditGrant.findFirst({
      where: { userId: u.id, source: "BACKFILL", refId },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const expiresAt = new Date(Date.now() + TTL_DAYS * 86_400_000);
    await prisma.$transaction(async (tx) => {
      await tx.aiCreditWallet.upsert({
        where: { userId: u.id },
        update: {},
        create: { userId: u.id, balance: 0 },
      });
      const grant = await tx.aiCreditGrant.create({
        data: {
          userId: u.id,
          source: "BACKFILL",
          amount: AMOUNT,
          remaining: AMOUNT,
          refId,
          expiresAt,
        },
      });
      await tx.aiCreditLedger.create({
        data: {
          userId: u.id,
          delta: AMOUNT,
          reason: "GRANT_BACKFILL",
          refId: String(grant.id),
          meta: { phase: 1, expiresAt: expiresAt.toISOString() },
        },
      });
      await tx.aiCreditWallet.update({
        where: { userId: u.id },
        data: {
          balance: { increment: AMOUNT },
          lifetimeEarned: { increment: AMOUNT },
        },
      });
    });
    granted++;
  }

  console.log(`[backfill] granted=${granted} skipped=${skipped}`);
}

main()
  .catch((err) => {
    console.error("[backfill] fatal:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
