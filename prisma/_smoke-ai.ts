/**
 * AI subsystem smoke check — runs against the active DB to verify schema +
 * service paths work without spinning up the Next.js server.
 *
 * NOT a unit test framework. Read-only where possible; reservation flow uses
 * a real user (the seeded admin) and credits, then refunds them.
 */

import { PrismaClient } from "@prisma/client";
import {
  cancelReservation,
  ensureFreeMonthlyGrant,
  expireGrants,
  getEffectivePlan,
  getWalletSummary,
  grantCredits,
  reserveCredits,
  settleReservation,
} from "../lib/services/aiCreditService";
import { AI_PACKS, AI_PLANS } from "../lib/config/aiPlans";
import { AI_ENDPOINT_COST } from "../lib/config/aiCosts";

const prisma = new PrismaClient();

function ok(label: string, condition: boolean, detail?: string) {
  console.log(`${condition ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!condition) process.exitCode = 1;
}

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true, email: true },
  });
  if (!admin) throw new Error("No ADMIN user found — seed the DB first");
  const userId = admin.id;
  console.log(`\n[smoke] Using ADMIN user #${userId} (${admin.email})\n`);

  // --- catalog sanity ---
  ok("AI_PLANS has 4 tiers", Object.keys(AI_PLANS).length === 4);
  ok("AI_PACKS has 4 packs", Object.keys(AI_PACKS).length === 4);
  ok("Voyager unlocks concierge", AI_PLANS.VOYAGER.features.concierge);
  ok("Founder allows family seats", AI_PLANS.FOUNDER.features.familySeats > 0);
  ok("Free plan has 20/mo", AI_PLANS.FREE.monthlyCredits === 20);

  // --- wallet baseline ---
  const before = await getWalletSummary(userId);
  console.log(`[wallet] balance=${before.balance} earned=${before.lifetimeEarned} spent=${before.lifetimeSpent} plan=${before.plan}`);

  // --- effective plan resolution ---
  const plan = await getEffectivePlan(userId);
  ok("getEffectivePlan returns a known plan key", plan in AI_PLANS, plan);

  // --- free monthly grant idempotency ---
  await ensureFreeMonthlyGrant(userId);
  const afterFirstFree = await getWalletSummary(userId);
  await ensureFreeMonthlyGrant(userId);
  const afterSecondFree = await getWalletSummary(userId);
  ok(
    "ensureFreeMonthlyGrant idempotent within month",
    afterFirstFree.balance === afterSecondFree.balance,
    `${afterFirstFree.balance} == ${afterSecondFree.balance}`
  );

  // --- reserve / settle ---
  const reserved = await reserveCredits(userId, "chat", AI_ENDPOINT_COST.chat);
  ok("reserveCredits ok=true", reserved.ok, `reservationId=${reserved.reservationId}`);
  if (!reserved.ok || reserved.reservationId == null) {
    console.error("[smoke] aborting — reservation failed");
    return;
  }
  const afterReserve = await getWalletSummary(userId);
  ok(
    "balance decremented after reserve",
    afterReserve.balance === before.balance + (afterFirstFree.balance - before.balance) - AI_ENDPOINT_COST.chat ||
      afterReserve.balance < afterSecondFree.balance,
    `${afterSecondFree.balance} → ${afterReserve.balance}`
  );

  // Settle with HALF the reserved cost — should refund 1 credit
  const half = Math.max(1, Math.floor(AI_ENDPOINT_COST.chat / 2));
  await settleReservation(reserved.reservationId, half, { smoke: true });
  const afterSettle = await getWalletSummary(userId);
  ok(
    "settleReservation refunded the delta",
    afterSettle.balance === afterReserve.balance + (AI_ENDPOINT_COST.chat - half),
    `${afterReserve.balance} → ${afterSettle.balance} (refund=${AI_ENDPOINT_COST.chat - half})`
  );

  // --- second reservation, full cancel ---
  const reserved2 = await reserveCredits(userId, "chat", AI_ENDPOINT_COST.chat);
  ok("second reserve ok", reserved2.ok && reserved2.reservationId != null);
  if (reserved2.ok && reserved2.reservationId != null) {
    const beforeCancel = await getWalletSummary(userId);
    await cancelReservation(reserved2.reservationId);
    const afterCancel = await getWalletSummary(userId);
    ok(
      "cancelReservation full-refunded the reservation",
      afterCancel.balance === beforeCancel.balance + AI_ENDPOINT_COST.chat,
      `${beforeCancel.balance} → ${afterCancel.balance}`
    );
  }

  // --- grant + expire ---
  const expiredRefId = `SMOKE-EXPIRED-${userId}-${Date.now()}`;
  await grantCredits({
    userId,
    source: "ADJUST",
    amount: 7,
    expiresInDays: -1, // already expired
    refId: expiredRefId,
  });
  const beforeExpire = await getWalletSummary(userId);
  const result = await expireGrants(new Date());
  const afterExpire = await getWalletSummary(userId);
  ok("expireGrants reclaimed the past-due grant", result.expired >= 7, `expired=${result.expired}, affected=${result.affected}`);
  ok(
    "balance dropped by expired amount",
    afterExpire.balance <= beforeExpire.balance - 7 + 1, // tolerance
    `${beforeExpire.balance} → ${afterExpire.balance}`
  );

  // --- ledger consistency ---
  const ledgerSum = await prisma.aiCreditLedger.aggregate({
    where: { userId },
    _sum: { delta: true },
  });
  const wallet = await prisma.aiCreditWallet.findUnique({ where: { userId } });
  console.log(
    `[ledger] sum(delta)=${ledgerSum._sum.delta} wallet.balance=${wallet?.balance} earned=${wallet?.lifetimeEarned} spent=${wallet?.lifetimeSpent}`
  );

  console.log("\n[smoke] done");
}

main()
  .catch((err) => {
    console.error("[smoke] FATAL:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
