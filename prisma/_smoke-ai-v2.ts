/**
 * Smoke check for Phase 9 (welcome grant + buckets + cost preview).
 */
import { PrismaClient } from "@prisma/client";
import {
  ensureWelcomeGrant,
  estimateCost,
  getCreditBuckets,
  getEffectivePlan,
} from "../lib/services/aiCreditService";
import {
  WELCOME_GRANT_AMOUNT,
  WELCOME_GRANT_TTL_DAYS,
  subscriptionGrantTtlDays,
} from "../lib/config/aiPlans";

const prisma = new PrismaClient();

function ok(label: string, condition: boolean, detail?: string) {
  console.log(`${condition ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!condition) process.exitCode = 1;
}

async function main() {
  // Subscription TTL is now 365 regardless of plan key
  ok("subscriptionGrantTtlDays(EXPLORER) == 365", subscriptionGrantTtlDays("EXPLORER") === 365);
  ok("subscriptionGrantTtlDays(FOUNDER) == 365", subscriptionGrantTtlDays("FOUNDER") === 365);
  ok("WELCOME_GRANT_AMOUNT == 50", WELCOME_GRANT_AMOUNT === 50);
  ok("WELCOME_GRANT_TTL_DAYS == 7", WELCOME_GRANT_TTL_DAYS === 7);

  // Pick admin user (legacy, has BACKFILL — should skip welcome)
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true, email: true, aiWelcomeGrantedAt: true },
  });
  if (!admin) throw new Error("no admin user");

  // Reset for clean idempotency test
  await prisma.user.update({
    where: { id: admin.id },
    data: { aiWelcomeGrantedAt: null },
  });

  const r1 = await ensureWelcomeGrant(admin.id);
  ok("ensureWelcomeGrant: legacy backfill user not granted", !r1.granted, `reason=${r1.reason}`);

  const r2 = await ensureWelcomeGrant(admin.id);
  ok("ensureWelcomeGrant: idempotent on second call", !r2.granted, `reason=${r2.reason}`);

  // Buckets snapshot
  const buckets = await getCreditBuckets(admin.id);
  console.log(
    "[buckets]",
    buckets.map((b) => `${b.source}=${b.totalRemaining}`).join(" "),
  );
  ok("buckets returns at least one entry for legacy user", buckets.length >= 1);

  // Effective plan
  const plan = await getEffectivePlan(admin.id);
  ok("getEffectivePlan ok for admin", ["FREE", "EXPLORER", "VOYAGER", "FOUNDER"].includes(plan));

  // Cost preview
  const c1 = await estimateCost(admin.id, "chat");
  ok("estimateCost(chat) returns 2 credits", c1.credits === 2, `credits=${c1.credits}`);
  const c2 = await estimateCost(admin.id, "plan", { days: 5 });
  ok("estimateCost(plan, 5d) returns 8 credits", c2.credits === 8);
  const c3 = await estimateCost(admin.id, "plan", { days: 10 });
  ok("estimateCost(plan, 10d) returns 12 credits", c3.credits === 12);
  const c4 = await estimateCost(admin.id, "voucher_read");
  ok("estimateCost(voucher_read) returns 5 credits", c4.credits === 5);
  const c5 = await estimateCost(admin.id, "day_of_trip");
  ok("estimateCost(day_of_trip) returns 0 or 3", c5.credits === 0 || c5.credits === 3);
  ok("estimateCost has balance + ok flag", typeof c1.balance === "number" && typeof c1.ok === "boolean");

  console.log("\n[smoke v2] done");
}

main()
  .catch((err) => {
    console.error("[smoke v2] FATAL:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
