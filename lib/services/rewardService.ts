/**
 * Reward Service — single chokepoint for booking-driven AI credit grants.
 *
 * Replaces the inline loyalty + referral blocks that lived in
 * postPaymentService. All rewards now mint AI credits (no points, no IDR
 * discount codes). Loyalty tier ladder is preserved (drives the booking
 * multiplier) — points themselves are no longer accrued by bookings.
 *
 * Two entry points:
 *   - applyBookingRewards(booking): on confirmed booking
 *       → tier housekeeping
 *       → BOOKING credit grant (5/Rp100k × tier multiplier, capped 500)
 *       → per-booking REFERRAL payout to inviter (10/Rp100k flat, capped 200)
 *       → first-booking thank-you to invitee (50 credits, once)
 *
 *   - clawbackBookingRewards(booking): on cancellation
 *       → zero out unspent BOOKING + REFERRAL grants tied to this booking
 *       → decrement LoyaltyAccount.lifetimeSpend
 *       → never go negative; already-spent credits stay
 */

import type { Booking } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { grantCredits } from "@/lib/services/aiCreditService";
import { sendReferralBookingInviterEmail } from "@/lib/email";

// ── Tunables (single source of truth) ────────────────────────────────────────
export const BOOKING_REWARD_PER_RP100K = 5;
export const BOOKING_REWARD_CAP = 500;
export const REFERRAL_REWARD_PER_RP100K = 10;
export const REFERRAL_REWARD_CAP = 200;
export const REFERRAL_INVITEE_THANKYOU_CREDITS = 50;
export const REFERRAL_RATE_LIMIT_PER_24H = 5;
export const REFERRAL_MIN_BOOKING_PRICE_IDR = 50_000;
export const TIER_GOLD_MIN_SPEND = 20_000_000;
export const TIER_SILVER_MIN_SPEND = 5_000_000;

type TierKey = "BRONZE" | "SILVER" | "GOLD";

function tierFor(spend: number): TierKey {
  if (spend >= TIER_GOLD_MIN_SPEND) return "GOLD";
  if (spend >= TIER_SILVER_MIN_SPEND) return "SILVER";
  return "BRONZE";
}

function tierMultiplier(tier: TierKey): number {
  return tier === "GOLD" ? 2 : tier === "SILVER" ? 1.5 : 1;
}

function bookingCreditAmount(totalPriceIdr: number, tier: TierKey): number {
  const base = Math.floor(totalPriceIdr / 100_000) * BOOKING_REWARD_PER_RP100K;
  return Math.min(BOOKING_REWARD_CAP, Math.floor(base * tierMultiplier(tier)));
}

function referralCreditAmount(totalPriceIdr: number): number {
  const base = Math.floor(totalPriceIdr / 100_000) * REFERRAL_REWARD_PER_RP100K;
  return Math.min(REFERRAL_REWARD_CAP, base);
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Apply tier ladder + AI credit reward for a confirmed booking. Then process
 * any active referral and pay the inviter.
 */
export async function applyBookingRewards(booking: Booking): Promise<{
  bookingCredits: number;
  referralCredits: number;
  thankyouCredits: number;
  newTier: TierKey;
  oldTier: TierKey;
}> {
  // Guest bookings have no account — nothing to reward
  if (booking.userId == null) {
    return { bookingCredits: 0, referralCredits: 0, thankyouCredits: 0, newTier: "BRONZE", oldTier: "BRONZE" };
  }
  // Tier housekeeping (still drives the multiplier)
  const account = await prisma.loyaltyAccount.upsert({
    where: { userId: booking.userId },
    update: {},
    create: { userId: booking.userId },
  });
  const oldTier = account.tier as TierKey;
  const newSpend = account.lifetimeSpend + booking.totalPrice;
  const newTier = tierFor(newSpend);

  await prisma.loyaltyAccount.update({
    where: { userId: booking.userId },
    data: {
      lifetimeSpend: newSpend,
      tier: newTier,
      // Points balance no longer accrues from bookings (Phase 10). Existing
      // balances are still spendable via /api/ai/loyalty-redeem.
    },
  });

  // BOOKING credits
  let bookingCredits = 0;
  try {
    bookingCredits = bookingCreditAmount(booking.totalPrice, newTier);
    if (bookingCredits > 0) {
      await grantCredits({
        userId: booking.userId,
        source: "BOOKING",
        amount: bookingCredits,
        expiresInDays: 365,
        refId: `BOOKING_${booking.bookingRef}`,
        reasonOverride: "GRANT_BOOKING",
      });
    }
  } catch (e) {
    console.error("[Reward] BOOKING grant failed:", e instanceof Error ? e.message : e);
  }

  // Audit row in LoyaltyLedger keeps the timeline, even though delta=0 now.
  await prisma.loyaltyLedger
    .create({
      data: {
        userId: booking.userId,
        delta: 0,
        reason: "BOOKING",
        refId: booking.bookingRef,
      },
    })
    .catch(() => {});

  // Referral payout
  const { referralCredits, thankyouCredits } = await applyReferralPayout(booking);

  return { bookingCredits, referralCredits, thankyouCredits, newTier, oldTier };
}

/**
 * Per-booking referral payout. Fires every confirmed booking from an invitee
 * (not just the first). Anti-fraud guards baked in.
 */
export async function applyReferralPayout(booking: Booking): Promise<{
  referralCredits: number;
  thankyouCredits: number;
}> {
  if (booking.userId == null) return { referralCredits: 0, thankyouCredits: 0 };
  if (booking.isMockMode) return { referralCredits: 0, thankyouCredits: 0 };
  if (booking.totalPrice < REFERRAL_MIN_BOOKING_PRICE_IDR) {
    return { referralCredits: 0, thankyouCredits: 0 };
  }

  const ref = await prisma.referral.findFirst({
    where: {
      inviteeId: booking.userId,
      status: { in: ["SIGNED_UP", "ACTIVE"] },
    },
  });
  if (!ref) return { referralCredits: 0, thankyouCredits: 0 };

  // Self-invite guard
  if (ref.inviterId === booking.userId) {
    return { referralCredits: 0, thankyouCredits: 0 };
  }

  // Mutual-loop guard (A invited B AND B invited A)
  const reverseLoop = await prisma.referral.findFirst({
    where: { inviterId: booking.userId, inviteeId: ref.inviterId },
  });
  if (reverseLoop) {
    console.warn(`[Reward] Mutual-loop referral skipped: ${ref.inviterId} ↔ ${booking.userId}`);
    return { referralCredits: 0, thankyouCredits: 0 };
  }

  // Phone verification gate (env-driven)
  if ((process.env.REQUIRE_PHONE_FOR_REFERRAL ?? "").toLowerCase() === "true") {
    const [inviter, invitee] = await Promise.all([
      prisma.user.findUnique({ where: { id: ref.inviterId }, select: { phone: true } }),
      prisma.user.findUnique({ where: { id: booking.userId }, select: { phone: true } }),
    ]);
    if (!inviter?.phone || !invitee?.phone) {
      console.warn(`[Reward] Referral skipped — phone unverified: inviter=${ref.inviterId} invitee=${booking.userId}`);
      return { referralCredits: 0, thankyouCredits: 0 };
    }
  }

  // Rate-limit (5 referral payouts per inviter per 24h)
  const recent = await prisma.aiCreditLedger.count({
    where: {
      userId: ref.inviterId,
      reason: "GRANT_REFERRAL",
      createdAt: { gte: new Date(Date.now() - 86_400_000) },
    },
  });
  if (recent >= REFERRAL_RATE_LIMIT_PER_24H) {
    console.warn(`[Reward] Referral rate-limited for inviter ${ref.inviterId}`);
    return { referralCredits: 0, thankyouCredits: 0 };
  }

  const inviterReward = referralCreditAmount(booking.totalPrice);
  const isFirstBooking = ref.bookingsCount === 0;
  let thankyouCredits = 0;

  if (inviterReward > 0) {
    await grantCredits({
      userId: ref.inviterId,
      source: "REFERRAL",
      amount: inviterReward,
      expiresInDays: 365,
      refId: `REF_${booking.bookingRef}`,
      reasonOverride: "GRANT_REFERRAL",
    });
  }

  if (isFirstBooking) {
    thankyouCredits = REFERRAL_INVITEE_THANKYOU_CREDITS;
    await grantCredits({
      userId: booking.userId,
      source: "REFERRAL",
      amount: thankyouCredits,
      expiresInDays: 365,
      refId: `REF_THANKYOU_${booking.bookingRef}`,
      reasonOverride: "GRANT_REFERRAL_THANKYOU",
    });
  }

  await prisma.referral.update({
    where: { id: ref.id },
    data: {
      status: "ACTIVE",
      bookingsCount: { increment: 1 },
      totalRewarded: { increment: inviterReward },
      firstBookingAt: ref.firstBookingAt ?? new Date(),
      rewardGiven: true,
    },
  });

  // Notify inviter via email (best-effort, non-blocking)
  if (inviterReward > 0) {
    try {
      const [inviter, invitee] = await Promise.all([
        prisma.user.findUnique({
          where: { id: ref.inviterId },
          select: { email: true, name: true },
        }),
        prisma.user.findUnique({
          where: { id: booking.userId },
          select: { name: true, email: true },
        }),
      ]);
      if (inviter?.email) {
        void sendReferralBookingInviterEmail({
          to: inviter.email,
          inviterName: inviter.name || "",
          inviteeName: invitee?.name || invitee?.email || "Your friend",
          credits: inviterReward,
          productTitle: booking.productTitle || "a Bali tour",
        }).catch((e) =>
          console.error("[Reward] inviter booking email failed:", e instanceof Error ? e.message : e)
        );
      }
    } catch (e) {
      console.error("[Reward] inviter lookup failed:", e instanceof Error ? e.message : e);
    }
  }

  console.log(
    `[Reward] Referral payout — inviter=${ref.inviterId} invitee=${booking.userId} booking=${booking.bookingRef} +${inviterReward}cr ${isFirstBooking ? `+${thankyouCredits}thx` : ""}`
  );

  return { referralCredits: inviterReward, thankyouCredits };
}

/**
 * Reverse rewards when a previously-CONFIRMED booking flips to CANCELLED.
 * Already-spent credits stay (no surprise debt). Only `remaining` is zeroed.
 */
export async function clawbackBookingRewards(booking: Booking): Promise<{
  reclaimed: number;
  bookingDecremented: boolean;
}> {
  // Guest bookings never earned rewards
  if (booking.userId == null) return { reclaimed: 0, bookingDecremented: false };
  const refIds = [`BOOKING_${booking.bookingRef}`, `REF_${booking.bookingRef}`, `REF_THANKYOU_${booking.bookingRef}`];

  let reclaimed = 0;
  for (const refId of refIds) {
    const grants = await prisma.aiCreditGrant.findMany({
      where: { refId, remaining: { gt: 0 } },
    });
    for (const g of grants) {
      const lost = g.remaining;
      reclaimed += lost;
      await prisma.$transaction([
        prisma.aiCreditGrant.update({
          where: { id: g.id },
          data: { remaining: 0, expiredAt: new Date() },
        }),
        prisma.aiCreditWallet.upsert({
          where: { userId: g.userId },
          update: {
            balance: { decrement: lost },
            lifetimeEarned: { decrement: lost },
          },
          create: { userId: g.userId },
        }),
        prisma.aiCreditLedger.create({
          data: {
            userId: g.userId,
            delta: -lost,
            reason: "BOOKING_CLAWBACK",
            refId,
            meta: { bookingRef: booking.bookingRef, source: g.source },
          },
        }),
      ]);
    }
  }

  // Decrement lifetimeSpend (best-effort — if user has booked since, we still
  // reduce by this booking's amount; tier recomputes on next booking).
  let bookingDecremented = false;
  try {
    const account = await prisma.loyaltyAccount.findUnique({
      where: { userId: booking.userId },
    });
    if (account && account.lifetimeSpend >= booking.totalPrice) {
      const newSpend = account.lifetimeSpend - booking.totalPrice;
      await prisma.loyaltyAccount.update({
        where: { userId: booking.userId },
        data: { lifetimeSpend: newSpend, tier: tierFor(newSpend) },
      });
      bookingDecremented = true;
    }
  } catch (e) {
    console.error("[Reward] Tier decrement failed:", e instanceof Error ? e.message : e);
  }

  // Decrement referral tally if this booking paid one
  try {
    const ref = await prisma.referral.findFirst({
      where: { inviteeId: booking.userId, status: "ACTIVE" },
    });
    if (ref && ref.bookingsCount > 0) {
      await prisma.referral.update({
        where: { id: ref.id },
        data: {
          bookingsCount: { decrement: 1 },
          // totalRewarded recompute would be expensive — leave audit trail intact
        },
      });
    }
  } catch (e) {
    console.error("[Reward] Referral tally decrement failed:", e instanceof Error ? e.message : e);
  }

  console.log(`[Reward] Clawback for ${booking.bookingRef} reclaimed=${reclaimed}cr`);
  return { reclaimed, bookingDecremented };
}
