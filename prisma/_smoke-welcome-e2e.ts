/**
 * End-to-end smoke: create a fresh user → call ensureWelcomeGrant → verify
 * 50-credit grant with 7-day expiry → call again, idempotent → verify wallet
 * buckets reflect the new WELCOME bucket → cleanup.
 */
import { PrismaClient } from "@prisma/client";
import {
  ensureWelcomeGrant,
  getCreditBuckets,
  getWalletSummary,
} from "../lib/services/aiCreditService";

const prisma = new PrismaClient();

function ok(label: string, cond: boolean, detail?: string) {
  console.log(`${cond ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!cond) process.exitCode = 1;
}

async function main() {
  const email = `_welcome_smoke_${Date.now()}@example.test`;
  const user = await prisma.user.create({
    data: {
      email,
      name: "Welcome Smoke",
      role: "USER",
      provider: "credentials",
      emailVerified: false,
    },
    select: { id: true, email: true, aiWelcomeGrantedAt: true },
  });
  console.log(`[e2e] created user #${user.id} (${email})\n`);

  try {
    // Step 1 — first grant fires
    const r1 = await ensureWelcomeGrant(user.id);
    ok("first ensureWelcomeGrant grants", r1.granted, `reason=${r1.reason ?? "ok"}`);

    const after1 = await prisma.user.findUnique({
      where: { id: user.id },
      select: { aiWelcomeGrantedAt: true },
    });
    ok("aiWelcomeGrantedAt populated", after1?.aiWelcomeGrantedAt != null);

    const grants = await prisma.aiCreditGrant.findMany({
      where: { userId: user.id, source: "WELCOME" },
    });
    ok("exactly 1 WELCOME grant created", grants.length === 1, `count=${grants.length}`);
    if (grants[0]) {
      ok("amount == 50", grants[0].amount === 50);
      ok("remaining == 50", grants[0].remaining === 50);
      const days = Math.round(
        (grants[0].expiresAt.getTime() - grants[0].grantedAt.getTime()) / 86_400_000
      );
      ok("expires in 7 days", days === 7, `days=${days}`);
      ok("refId is WELCOME_<userId>", grants[0].refId === `WELCOME_${user.id}`);
    }

    // Step 2 — second call is idempotent
    const r2 = await ensureWelcomeGrant(user.id);
    ok("second ensureWelcomeGrant does NOT grant", !r2.granted, `reason=${r2.reason}`);
    const grantsAfter2 = await prisma.aiCreditGrant.count({
      where: { userId: user.id, source: "WELCOME" },
    });
    ok("still exactly 1 WELCOME grant", grantsAfter2 === 1);

    // Step 3 — wallet snapshot
    const summary = await getWalletSummary(user.id);
    ok("wallet balance == 50", summary.balance === 50, `balance=${summary.balance}`);
    ok("expiringIn7d >= 50", summary.expiringIn7d >= 50, `expiringIn7d=${summary.expiringIn7d}`);

    const buckets = await getCreditBuckets(user.id);
    ok("buckets has WELCOME entry", buckets.some((b) => b.source === "WELCOME"));
    const welcome = buckets.find((b) => b.source === "WELCOME");
    ok("WELCOME bucket totalRemaining == 50", welcome?.totalRemaining === 50);
    ok("WELCOME bucket has 1 grant", (welcome?.grants?.length ?? 0) === 1);

    // Step 4 — ledger row exists
    const ledger = await prisma.aiCreditLedger.findFirst({
      where: { userId: user.id, reason: "GRANT_WELCOME" },
    });
    ok("ledger has GRANT_WELCOME row", !!ledger);
    ok("ledger.delta == 50", ledger?.delta === 50);

    console.log("\n[e2e] welcome flow verified");
  } finally {
    // Cleanup — cascades through grant + ledger + wallet via FK CASCADE.
    await prisma.user.delete({ where: { id: user.id } });
    console.log(`[e2e] cleaned up user #${user.id}`);
  }
}

main()
  .catch((err) => {
    console.error("[e2e] FATAL:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
