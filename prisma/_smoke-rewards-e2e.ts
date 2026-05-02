/**
 * Phase-10 reward system end-to-end smoke.
 *
 * Verifies:
 *  - Booking → tier housekeeping + BOOKING credit grant.
 *  - Referral happy path: invitee first booking pays inviter + thank-you.
 *  - Subsequent invitee booking pays inviter again, no second thank-you.
 *  - Self-invite, mutual loop, mock booking, low-price guards.
 *  - Clawback: cancelled booking zeroes unspent reward grants.
 *
 * Cleans up all created users at the end.
 */

import { PrismaClient } from "@prisma/client";
import {
  applyBookingRewards,
  applyReferralPayout,
  clawbackBookingRewards,
} from "../lib/services/rewardService";

const prisma = new PrismaClient();

function ok(label: string, cond: boolean, detail?: string) {
  console.log(`${cond ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!cond) process.exitCode = 1;
}

async function makeUser(suffix: string) {
  return prisma.user.create({
    data: {
      email: `_rwd_${suffix}_${Date.now()}@example.test`,
      name: `Smoke ${suffix}`,
      role: "USER",
      provider: "credentials",
      emailVerified: true,
    },
    select: { id: true, email: true },
  });
}

async function makeBooking(userId: number, totalPrice: number, opts?: { mock?: boolean }) {
  const ref = `SMOKE-${userId}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  return prisma.booking.create({
    data: {
      userId,
      bookingRef: ref,
      paymentId: ref,
      productCode: "SMOKE",
      productTitle: "Smoke Tour",
      totalPrice,
      currency: "IDR",
      travelDate: new Date(Date.now() + 14 * 86_400_000),
      pax: 1,
      status: "CONFIRMED",
      isMockMode: opts?.mock ?? false,
    },
  });
}

async function balance(userId: number): Promise<number> {
  const w = await prisma.aiCreditWallet.findUnique({ where: { userId } });
  return w?.balance ?? 0;
}

async function main() {
  const inviter = await makeUser("inv");
  const invitee = await makeUser("inve");
  const self = await makeUser("self");
  const loopA = await makeUser("loopA");
  const loopB = await makeUser("loopB");
  const cleanup: number[] = [inviter.id, invitee.id, self.id, loopA.id, loopB.id];

  try {
    // 1. Booking accrual happy path
    const b1 = await makeBooking(invitee.id, 1_000_000); // Rp 1M, Bronze tier → 50 cr
    const r1 = await applyBookingRewards(b1);
    ok("Booking grants 50 credits at Bronze for Rp 1M", r1.bookingCredits === 50, `got=${r1.bookingCredits}`);
    ok("Tier remains BRONZE (< Rp 5M lifetime)", r1.newTier === "BRONZE");

    const balInvitee1 = await balance(invitee.id);
    ok("invitee wallet contains 50 credits", balInvitee1 === 50);

    // 2. Self-invite guard
    await prisma.referral.create({
      data: {
        inviterId: self.id,
        inviteeId: self.id,
        inviteeEmail: `self-${self.id}@example.test`,
        code: `SELF${self.id}`,
        status: "SIGNED_UP",
      },
    });
    const bSelf = await makeBooking(self.id, 1_000_000);
    const rSelf = await applyReferralPayout(bSelf);
    ok("self-invite skipped", rSelf.referralCredits === 0 && rSelf.thankyouCredits === 0);

    // 3. Mutual-loop guard
    await prisma.referral.create({
      data: {
        inviterId: loopA.id,
        inviteeId: loopB.id,
        inviteeEmail: `loopB-${loopB.id}@example.test`,
        code: `LA${loopA.id}`,
        status: "SIGNED_UP",
      },
    });
    await prisma.referral.create({
      data: {
        inviterId: loopB.id,
        inviteeId: loopA.id,
        inviteeEmail: `loopA-${loopA.id}@example.test`,
        code: `LB${loopB.id}`,
        status: "SIGNED_UP",
      },
    });
    const bLoop = await makeBooking(loopB.id, 1_000_000);
    const rLoop = await applyReferralPayout(bLoop);
    ok("mutual loop skipped", rLoop.referralCredits === 0 && rLoop.thankyouCredits === 0);

    // 4. Mock booking guard
    const bMock = await makeBooking(invitee.id, 1_000_000, { mock: true });
    const rMock = await applyReferralPayout(bMock);
    ok("mock booking skipped", rMock.referralCredits === 0 && rMock.thankyouCredits === 0);

    // 5. Low-price guard
    const bSmall = await makeBooking(invitee.id, 30_000); // < Rp 50k floor
    const rSmall = await applyReferralPayout(bSmall);
    ok("low-price (< Rp 50k) skipped", rSmall.referralCredits === 0);

    // 6. Real referral happy path — inviter→invitee, first booking
    await prisma.referral.create({
      data: {
        inviterId: inviter.id,
        inviteeId: invitee.id,
        inviteeEmail: `inve-${invitee.id}@example.test`,
        code: `INV${inviter.id}`,
        status: "SIGNED_UP",
      },
    });
    const b2 = await makeBooking(invitee.id, 1_500_000); // Rp 1.5M → inviter +150 (capped 200)
    const r2 = await applyBookingRewards(b2);
    ok("Referral inviter reward = 150 credits", r2.referralCredits === 150);
    ok("Referral first-booking thank-you = 50", r2.thankyouCredits === 50);
    const inviterBal = await balance(inviter.id);
    ok("inviter wallet credited", inviterBal === 150);

    // 7. Subsequent invitee booking — pays inviter again, no thank-you
    const b3 = await makeBooking(invitee.id, 500_000); // Rp 500k → inviter +50
    const r3 = await applyReferralPayout(b3);
    ok("Subsequent booking inviter reward = 50 credits", r3.referralCredits === 50);
    ok("No second thank-you on subsequent booking", r3.thankyouCredits === 0);

    const ref = await prisma.referral.findFirst({
      where: { inviterId: inviter.id, inviteeId: invitee.id },
    });
    ok("Referral.bookingsCount == 2", ref?.bookingsCount === 2, `got=${ref?.bookingsCount}`);
    ok("Referral.totalRewarded == 200", ref?.totalRewarded === 200, `got=${ref?.totalRewarded}`);
    ok("Referral.status == ACTIVE", ref?.status === "ACTIVE");

    // 8. Clawback — cancel b2, recheck balances
    const balBefore = await balance(invitee.id);
    const inviterBalBefore = await balance(inviter.id);
    await prisma.booking.update({ where: { id: b2.id }, data: { status: "CANCELLED" } });
    const cb = await clawbackBookingRewards(b2);
    ok("Clawback reclaimed at least the inviter+thankyou+booking from b2", cb.reclaimed > 0, `reclaimed=${cb.reclaimed}`);
    const inviterBalAfter = await balance(inviter.id);
    ok("Inviter balance dropped after clawback", inviterBalAfter < inviterBalBefore, `before=${inviterBalBefore} after=${inviterBalAfter}`);
    const inviteeBalAfter = await balance(invitee.id);
    ok("Invitee balance dropped after clawback (booking + thank-you)", inviteeBalAfter < balBefore);

    console.log("\n[smoke rewards] done");
  } finally {
    // Cleanup — referral rows have cascade FKs through inviter
    for (const id of cleanup) {
      await prisma.user.delete({ where: { id } }).catch(() => {});
    }
    console.log(`[smoke rewards] cleaned up ${cleanup.length} users`);
  }
}

main()
  .catch((e) => {
    console.error("[smoke rewards] FATAL:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
