/**
 * AI Credit Service — single chokepoint for billing AI usage.
 *
 * Every AI route reserves credits before invoking the LLM and settles the exact
 * cost after. Spend order: oldest expiresAt grant first (FIFO with TTL priority).
 *
 * Reservation lifecycle:
 *   reserveCredits → SPEND ledger row (reservationStatus=RESERVED)
 *   settleReservation → adjust delta to actual cost (refund unused, RESERVED→SETTLED)
 *   cancelReservation → full refund (RESERVED→CANCELLED)
 *
 * Wallet.balance is denormalised running total of sum(grants.remaining where
 * remaining > 0 and not expired). Guarded by a serialisable transaction.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  AI_CREDIT_GUARD_ON,
  AI_MAX_RESERVATION,
  type AiEndpoint,
} from "@/lib/config/aiCosts";
import {
  AI_PACKS,
  AI_PLANS,
  BACKFILL_GRANT_AMOUNT,
  BACKFILL_GRANT_TTL_DAYS,
  LOYALTY_GRANT_TTL_DAYS,
  PROMO_GRANT_TTL_DAYS,
  WELCOME_GRANT_AMOUNT,
  WELCOME_GRANT_TTL_DAYS,
  subscriptionGrantTtlDays,
  type AiPackKey,
  type AiPlanKey,
} from "@/lib/config/aiPlans";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GrantSource =
  | "WELCOME"
  | "SUBSCRIPTION"
  | "TOPUP"
  | "PROMO"
  | "REFERRAL"
  | "LOYALTY_REDEEM"
  | "REFUND"
  | "ADJUST"
  | "BACKFILL"
  | "BOOKING";

export type DenialReason =
  | "QUOTA"
  | "AUTH"
  | "RATE_LIMIT"
  | "SUBSCRIPTION_GRACE"
  | "FEATURE_LOCKED"
  | "INVALID_AMOUNT";

export interface ReserveResult {
  ok: boolean;
  reservationId?: number;
  reason?: DenialReason;
  remainingBalance: number;
}

export interface WalletSummary {
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  expiringIn7d: number;
  /** Active subscription plan, or "FREE" if none. */
  plan: AiPlanKey;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function ensureWallet(tx: Prisma.TransactionClient, userId: number) {
  return tx.aiCreditWallet.upsert({
    where: { userId },
    update: {},
    create: { userId, balance: 0 },
  });
}

function clampReservation(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.min(Math.ceil(amount), AI_MAX_RESERVATION);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Reserve credits before invoking the LLM. Atomic: locks wallet, decrements
 * grants oldest-expiry-first, writes a RESERVED ledger row.
 *
 * Returns ok=false with reason="QUOTA" when balance < estimatedCost.
 */
export async function reserveCredits(
  userId: number,
  endpoint: AiEndpoint,
  estimatedCost: number
): Promise<ReserveResult> {
  const cost = clampReservation(estimatedCost);
  if (cost <= 0) {
    return { ok: false, reason: "INVALID_AMOUNT", remainingBalance: 0 };
  }

  if (!AI_CREDIT_GUARD_ON) {
    // Kill-switch: pretend we reserved, no DB writes. Settlement is a no-op.
    return { ok: true, reservationId: -1, remainingBalance: Number.MAX_SAFE_INTEGER };
  }

  return prisma.$transaction(async (tx) => {
    await ensureWallet(tx, userId);

    const now = new Date();
    const grants = await tx.aiCreditGrant.findMany({
      where: {
        userId,
        remaining: { gt: 0 },
        expiresAt: { gt: now },
      },
      orderBy: { expiresAt: "asc" },
    });

    const available = grants.reduce((acc, g) => acc + g.remaining, 0);

    if (available < cost) {
      return { ok: false, reason: "QUOTA" as const, remainingBalance: available };
    }

    // Decrement grants in order, capturing the (grantId, taken) tuples.
    const taken: Array<{ grantId: number; taken: number }> = [];
    let remainingToTake = cost;
    for (const g of grants) {
      if (remainingToTake <= 0) break;
      const take = Math.min(g.remaining, remainingToTake);
      remainingToTake -= take;
      taken.push({ grantId: g.id, taken: take });
      await tx.aiCreditGrant.update({
        where: { id: g.id },
        data: { remaining: g.remaining - take },
      });
    }

    const ledger = await tx.aiCreditLedger.create({
      data: {
        userId,
        delta: -cost,
        reason: `SPEND_${endpoint.toUpperCase()}`,
        reservationStatus: "RESERVED",
        meta: { endpoint, taken },
      },
    });

    await tx.aiCreditWallet.update({
      where: { userId },
      data: {
        balance: { decrement: cost },
        lifetimeSpent: { increment: cost },
      },
    });

    return {
      ok: true as const,
      reservationId: ledger.id,
      remainingBalance: available - cost,
    };
  });
}

/**
 * Settle a reservation with actual cost. If actualCost < reserved, refund the
 * delta back into the same grants (newest-grant-first to preserve TTL priority
 * of older grants).
 */
export async function settleReservation(
  reservationId: number,
  actualCost: number,
  meta?: Record<string, unknown>
): Promise<void> {
  if (!AI_CREDIT_GUARD_ON || reservationId === -1) return;

  await prisma.$transaction(async (tx) => {
    const ledger = await tx.aiCreditLedger.findUnique({ where: { id: reservationId } });
    if (!ledger || ledger.reservationStatus !== "RESERVED") return;

    const reserved = -ledger.delta; // delta is negative
    const actual = clampReservation(actualCost);
    const refund = Math.max(0, reserved - actual);

    if (refund > 0) {
      // Refund into the grants we took from (reverse order: newest first)
      const ledgerMeta = (ledger.meta as { taken?: Array<{ grantId: number; taken: number }> } | null) ?? {};
      const taken = (ledgerMeta.taken ?? []).slice().reverse();

      let remainingToRefund = refund;
      for (const t of taken) {
        if (remainingToRefund <= 0) break;
        const give = Math.min(t.taken, remainingToRefund);
        remainingToRefund -= give;
        await tx.aiCreditGrant.update({
          where: { id: t.grantId },
          data: { remaining: { increment: give } },
        });
      }

      await tx.aiCreditWallet.update({
        where: { userId: ledger.userId },
        data: {
          balance: { increment: refund },
          lifetimeSpent: { decrement: refund },
        },
      });
    }

    await tx.aiCreditLedger.update({
      where: { id: reservationId },
      data: {
        delta: -actual,
        reservationStatus: "SETTLED",
        settledAt: new Date(),
        meta: {
          ...(ledger.meta as Prisma.JsonObject),
          settled: (meta ?? {}) as Prisma.JsonObject,
          actualCost: actual,
          refund,
        },
      },
    });
  });
}

/** Cancel a reservation entirely (e.g. LLM call failed). Full refund. */
export async function cancelReservation(reservationId: number): Promise<void> {
  if (!AI_CREDIT_GUARD_ON || reservationId === -1) return;

  await prisma.$transaction(async (tx) => {
    const ledger = await tx.aiCreditLedger.findUnique({ where: { id: reservationId } });
    if (!ledger || ledger.reservationStatus !== "RESERVED") return;

    const refund = -ledger.delta;
    const ledgerMeta = (ledger.meta as { taken?: Array<{ grantId: number; taken: number }> } | null) ?? {};
    const taken = (ledgerMeta.taken ?? []).slice().reverse();

    let remainingToRefund = refund;
    for (const t of taken) {
      if (remainingToRefund <= 0) break;
      const give = Math.min(t.taken, remainingToRefund);
      remainingToRefund -= give;
      await tx.aiCreditGrant.update({
        where: { id: t.grantId },
        data: { remaining: { increment: give } },
      });
    }

    await tx.aiCreditWallet.update({
      where: { userId: ledger.userId },
      data: {
        balance: { increment: refund },
        lifetimeSpent: { decrement: refund },
      },
    });

    await tx.aiCreditLedger.update({
      where: { id: reservationId },
      data: {
        delta: 0,
        reservationStatus: "CANCELLED",
        settledAt: new Date(),
      },
    });
  });
}

/**
 * Grant credits to a user. Writes one AiCreditGrant + one positive ledger row.
 * Caller responsible for idempotency via refId where relevant.
 */
export async function grantCredits(params: {
  userId: number;
  source: GrantSource;
  amount: number;
  expiresInDays: number;
  refId?: string;
  reasonOverride?: string;
}): Promise<void> {
  const { userId, source, amount, expiresInDays, refId, reasonOverride } = params;
  if (amount <= 0) return;

  const expiresAt = new Date(Date.now() + expiresInDays * 86_400_000);

  await prisma.$transaction(async (tx) => {
    await ensureWallet(tx, userId);

    const grant = await tx.aiCreditGrant.create({
      data: {
        userId,
        source,
        amount,
        remaining: amount,
        refId: refId ?? null,
        expiresAt,
      },
    });

    await tx.aiCreditLedger.create({
      data: {
        userId,
        delta: amount,
        reason: reasonOverride ?? `GRANT_${source}`,
        refId: refId ?? String(grant.id),
        meta: { grantId: grant.id, expiresAt: expiresAt.toISOString() },
      },
    });

    await tx.aiCreditWallet.update({
      where: { userId },
      data: {
        balance: { increment: amount },
        lifetimeEarned: { increment: amount },
      },
    });
  });
}

/** Convenience: grant credits for a paid TopUp pack. */
export async function grantTopupPack(
  userId: number,
  pack: AiPackKey,
  refId: string
): Promise<void> {
  const def = AI_PACKS[pack];
  await grantCredits({
    userId,
    source: "TOPUP",
    amount: def.credits,
    expiresInDays: def.expiryDays,
    refId,
  });
}

/** Convenience: grant credits for a subscription period. */
export async function grantSubscriptionPeriod(
  userId: number,
  plan: AiPlanKey,
  refId: string
): Promise<void> {
  const def = AI_PLANS[plan];
  if (def.monthlyCredits <= 0) return;
  await grantCredits({
    userId,
    source: "SUBSCRIPTION",
    amount: def.monthlyCredits,
    expiresInDays: subscriptionGrantTtlDays(plan),
    refId,
  });
}

/**
 * Free-tier monthly auto-grant. Idempotent per calendar month — at most one
 * FREE_MONTHLY grant per user per UTC month. Safe to call before every AI
 * request; cheap query.
 *
 * Skipped when:
 * - User has an ACTIVE/GRACE paid subscription (those get SUBSCRIPTION grants).
 * - A FREE_MONTHLY grant already exists for the current month.
 */
export async function ensureFreeMonthlyGrant(userId: number): Promise<{ granted: boolean; refId?: string }> {
  if (!AI_CREDIT_GUARD_ON) return { granted: false };

  const sub = await prisma.aiSubscription.findUnique({ where: { userId } });
  if (sub && (sub.status === "ACTIVE" || sub.status === "GRACE")) {
    return { granted: false };
  }

  const now = new Date();
  const refId = `FREE_MONTHLY_${userId}_${now.getUTCFullYear()}_${now.getUTCMonth() + 1}`;

  const existing = await prisma.aiCreditGrant.findFirst({
    where: { userId, source: "PROMO", refId },
    select: { id: true },
  });
  if (existing) return { granted: false };

  // FREE plan defines monthlyCredits (default 20).
  const amount = AI_PLANS.FREE.monthlyCredits;
  if (amount <= 0) return { granted: false };

  // 35-day TTL gives a small grace cushion if user logs in at month-edge.
  await grantCredits({
    userId,
    source: "PROMO",
    amount,
    expiresInDays: 35,
    refId,
    reasonOverride: "GRANT_FREE_MONTHLY",
  });

  return { granted: true, refId };
}

/**
 * Welcome grant for first-time signups. Grants WELCOME_GRANT_AMOUNT credits
 * with WELCOME_GRANT_TTL_DAYS expiry. Idempotent via User.aiWelcomeGrantedAt.
 *
 * Skipped silently if:
 *  - Kill switch is off.
 *  - User already has aiWelcomeGrantedAt populated.
 *  - User has any existing AiCreditGrant from "BACKFILL" source (legacy users
 *    keep their backfill in lieu of a welcome grant).
 */
export async function ensureWelcomeGrant(userId: number): Promise<{ granted: boolean; reason?: string }> {
  if (!AI_CREDIT_GUARD_ON) return { granted: false, reason: "guard_off" };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, aiWelcomeGrantedAt: true },
  });
  if (!user) return { granted: false, reason: "user_not_found" };
  if (user.aiWelcomeGrantedAt) return { granted: false, reason: "already_granted" };

  // Legacy backfill protection: skip if user got the Phase-1 BACKFILL grant.
  const legacy = await prisma.aiCreditGrant.findFirst({
    where: { userId, source: "BACKFILL" },
    select: { id: true },
  });
  if (legacy) {
    // Mark grantedAt anyway so we don't re-check on every call.
    await prisma.user.update({
      where: { id: userId },
      data: { aiWelcomeGrantedAt: new Date() },
    });
    return { granted: false, reason: "legacy_user" };
  }

  const refId = `WELCOME_${userId}`;
  const dupe = await prisma.aiCreditGrant.findFirst({
    where: { userId, source: "WELCOME", refId },
    select: { id: true },
  });
  if (dupe) {
    await prisma.user.update({
      where: { id: userId },
      data: { aiWelcomeGrantedAt: new Date() },
    });
    return { granted: false, reason: "grant_exists" };
  }

  await grantCredits({
    userId,
    source: "WELCOME",
    amount: WELCOME_GRANT_AMOUNT,
    expiresInDays: WELCOME_GRANT_TTL_DAYS,
    refId,
    reasonOverride: "GRANT_WELCOME",
  });

  await prisma.user.update({
    where: { id: userId },
    data: { aiWelcomeGrantedAt: new Date() },
  });

  return { granted: true };
}

/** Convenience: backfill grant on Phase 1 rollout (idempotent by refId). */
export async function backfillGrantOnce(userId: number): Promise<{ granted: boolean }> {
  const refId = `BACKFILL_PHASE1_${userId}`;
  const existing = await prisma.aiCreditGrant.findFirst({
    where: { userId, source: "BACKFILL", refId },
    select: { id: true },
  });
  if (existing) return { granted: false };

  await grantCredits({
    userId,
    source: "BACKFILL",
    amount: BACKFILL_GRANT_AMOUNT,
    expiresInDays: BACKFILL_GRANT_TTL_DAYS,
    refId,
  });
  return { granted: true };
}

/**
 * Expire all grants past their expiry. Writes negative ledger rows for the
 * remaining amount and zeroes wallet balance accordingly.
 */
export async function expireGrants(now: Date = new Date()): Promise<{ expired: number; affected: number }> {
  const stale = await prisma.aiCreditGrant.findMany({
    where: { expiresAt: { lte: now }, expiredAt: null, remaining: { gt: 0 } },
  });

  let totalExpired = 0;
  for (const g of stale) {
    await prisma.$transaction(async (tx) => {
      await ensureWallet(tx, g.userId);
      const lost = g.remaining;
      if (lost <= 0) {
        await tx.aiCreditGrant.update({
          where: { id: g.id },
          data: { expiredAt: now },
        });
        return;
      }
      await tx.aiCreditGrant.update({
        where: { id: g.id },
        data: { remaining: 0, expiredAt: now },
      });
      await tx.aiCreditLedger.create({
        data: {
          userId: g.userId,
          delta: -lost,
          reason: "EXPIRE",
          refId: String(g.id),
          meta: { grantId: g.id, source: g.source, originalAmount: g.amount },
        },
      });
      await tx.aiCreditWallet.update({
        where: { userId: g.userId },
        data: { balance: { decrement: lost } },
      });
      totalExpired += lost;
    });
  }

  return { expired: totalExpired, affected: stale.length };
}

/**
 * Resolve the effective plan key for a user, accounting for AiFamilySeat
 * membership: a seat-holder inherits the owner's plan + features (but spends
 * their own credits — owner credits do not pool across seats).
 */
export async function getEffectivePlan(userId: number): Promise<AiPlanKey> {
  const sub = await prisma.aiSubscription.findUnique({ where: { userId } });
  if (sub && (sub.status === "ACTIVE" || sub.status === "GRACE")) {
    return sub.plan as AiPlanKey;
  }

  // Family seat fallback — accept owner's plan if seat is active.
  const seat = await prisma.aiFamilySeat.findUnique({
    where: { memberUserId: userId },
    include: { owner: { select: { id: true } } },
  });
  if (seat && seat.acceptedAt && !seat.revokedAt) {
    const ownerSub = await prisma.aiSubscription.findUnique({
      where: { userId: seat.ownerUserId },
    });
    if (
      ownerSub &&
      (ownerSub.status === "ACTIVE" || ownerSub.status === "GRACE") &&
      AI_PLANS[ownerSub.plan as AiPlanKey].features.familySeats > 0
    ) {
      return ownerSub.plan as AiPlanKey;
    }
  }

  return "FREE";
}

/** Read-only summary for the wallet UI. */
export async function getWalletSummary(userId: number): Promise<WalletSummary> {
  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 86_400_000);

  const [wallet, expiringSoon, plan] = await Promise.all([
    prisma.aiCreditWallet.findUnique({ where: { userId } }),
    prisma.aiCreditGrant.aggregate({
      where: {
        userId,
        remaining: { gt: 0 },
        expiresAt: { gt: now, lte: sevenDays },
      },
      _sum: { remaining: true },
    }),
    getEffectivePlan(userId),
  ]);

  return {
    balance: wallet?.balance ?? 0,
    lifetimeEarned: wallet?.lifetimeEarned ?? 0,
    lifetimeSpent: wallet?.lifetimeSpent ?? 0,
    expiringIn7d: expiringSoon._sum.remaining ?? 0,
    plan,
  };
}

/** Feature gate for plan-tier specific endpoints. */
export async function canUseFeature(
  userId: number,
  feature: keyof AiPlan["features"]
): Promise<boolean> {
  const planKey = await getEffectivePlan(userId);
  const features = AI_PLANS[planKey].features as Record<string, unknown>;
  const v = features[feature as string];
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v > 0;
  return false;
}

// Type alias used by canUseFeature signature above (declaration-hoisted)
type AiPlan = (typeof AI_PLANS)[AiPlanKey];

// ---------------------------------------------------------------------------
// Bucket breakdown — wallet UI transparency
// ---------------------------------------------------------------------------

export interface BucketGrantSummary {
  id: number;
  amount: number;
  remaining: number;
  grantedAt: string;
  expiresAt: string;
  daysToExpiry: number;
  refId: string | null;
}

export interface CreditBucket {
  source: GrantSource;
  label: string;
  description: string;
  totalRemaining: number;
  soonestExpiry: string | null;
  grants: BucketGrantSummary[];
}

const BUCKET_META: Record<GrantSource, { label: string; description: string }> = {
  WELCOME: {
    label: "Welcome bonus",
    description: "Free trial credits — try the AI for 7 days.",
  },
  SUBSCRIPTION: {
    label: "Subscription",
    description: "Monthly grant from your active subscription. Valid 365 days from grant.",
  },
  TOPUP: {
    label: "Top-up pack",
    description: "Credits you bought directly. Valid 365 days from purchase.",
  },
  PROMO: {
    label: "Promo / Free monthly",
    description: "Promotional credits or free-tier monthly grant.",
  },
  REFERRAL: {
    label: "Referral bonus",
    description: "Earned by inviting a friend who signed up.",
  },
  LOYALTY_REDEEM: {
    label: "Loyalty redemption",
    description: "Credits exchanged from loyalty points. Valid 90 days.",
  },
  REFUND: {
    label: "Refund",
    description: "Credits restored from a refund.",
  },
  ADJUST: {
    label: "Manual adjustment",
    description: "Granted by support / admin.",
  },
  BACKFILL: {
    label: "Launch bonus",
    description: "One-time legacy bonus from when the AI subsystem launched.",
  },
  BOOKING: {
    label: "Trip rewards",
    description: "Earned automatically on every confirmed booking. Multiplied by your loyalty tier (Bronze 1× / Silver 1.5× / Gold 2×).",
  },
};

function dayDiff(from: Date, to: Date): number {
  return Math.max(0, Math.ceil((to.getTime() - from.getTime()) / 86_400_000));
}

/**
 * Group all live grants by source for the wallet UI. Returns one bucket per
 * source the user has any positive remaining in, ordered by total remaining
 * descending. Within a bucket, grants are ordered oldest-expiry-first (which
 * is also spend order).
 */
export async function getCreditBuckets(userId: number): Promise<CreditBucket[]> {
  const now = new Date();
  const grants = await prisma.aiCreditGrant.findMany({
    where: { userId, remaining: { gt: 0 }, expiresAt: { gt: now } },
    orderBy: { expiresAt: "asc" },
  });

  const groups = new Map<GrantSource, BucketGrantSummary[]>();
  for (const g of grants) {
    const src = g.source as GrantSource;
    const list = groups.get(src) ?? [];
    list.push({
      id: g.id,
      amount: g.amount,
      remaining: g.remaining,
      grantedAt: g.grantedAt.toISOString(),
      expiresAt: g.expiresAt.toISOString(),
      daysToExpiry: dayDiff(now, g.expiresAt),
      refId: g.refId ?? null,
    });
    groups.set(src, list);
  }

  const buckets: CreditBucket[] = [];
  for (const [source, list] of groups.entries()) {
    const meta = BUCKET_META[source] ?? { label: source, description: "" };
    const totalRemaining = list.reduce((acc, g) => acc + g.remaining, 0);
    const soonestExpiry = list.reduce<string | null>(
      (acc, g) => (acc == null || g.expiresAt < acc ? g.expiresAt : acc),
      null
    );
    buckets.push({
      source,
      label: meta.label,
      description: meta.description,
      totalRemaining,
      soonestExpiry,
      grants: list,
    });
  }

  buckets.sort((a, b) => b.totalRemaining - a.totalRemaining);
  return buckets;
}

// ---------------------------------------------------------------------------
// Cost preview — let the UI tell users exactly what they'll spend
// ---------------------------------------------------------------------------

export interface CostEstimate {
  endpoint: AiEndpoint;
  credits: number;
  balance: number;
  afterBalance: number;
  ok: boolean;
  freeForTraveler: boolean;
  label: string;
  reason?: DenialReason;
}

const ENDPOINT_LABELS: Record<AiEndpoint, string> = {
  chat: "Quick chat with the AI assistant",
  plan: "Generate a Bali itinerary",
  plan_refine: "Refine one day of an itinerary",
  search: "Smart product search",
  concierge: "Concierge chat with memory",
  day_of_trip: "Day-of-trip helper",
  cultural: "Cultural calendar question",
  voucher_read: "Read a booking voucher (vision)",
};

/**
 * Compute the cost of an upcoming AI action without spending anything. Used by
 * the UI to show a Cost / Balance preview before the user clicks Submit.
 */
export async function estimateCost(
  userId: number,
  endpoint: AiEndpoint,
  params?: { days?: number }
): Promise<CostEstimate> {
  const wallet = await prisma.aiCreditWallet.findUnique({ where: { userId } });
  const balance = wallet?.balance ?? 0;

  // Variable-cost endpoints
  let credits: number;
  if (endpoint === "plan") {
    const days = Math.max(1, Math.min(14, params?.days ?? 5));
    credits = days <= 7 ? 8 : 12;
  } else {
    // Static cost map (mirrors AI_ENDPOINT_COST in aiCosts.ts)
    const STATIC: Record<AiEndpoint, number> = {
      chat: 2,
      plan: 8,
      plan_refine: 6,
      search: 1,
      concierge: 4,
      day_of_trip: 3,
      cultural: 2,
      voucher_read: 5,
    };
    credits = STATIC[endpoint];
  }

  // Free-for-traveler bypass on day_of_trip
  let freeForTraveler = false;
  if (endpoint === "day_of_trip") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today.getTime() - 86_400_000);
    const fortnight = new Date(today.getTime() + 14 * 86_400_000);
    const activeBooking = await prisma.booking.findFirst({
      where: {
        userId,
        status: "CONFIRMED",
        travelDate: { gte: yesterday, lte: fortnight },
      },
      select: { id: true },
    });
    freeForTraveler = !!activeBooking;
  }

  const effectiveCost = freeForTraveler ? 0 : credits;
  const afterBalance = balance - effectiveCost;
  const ok = afterBalance >= 0;

  return {
    endpoint,
    credits: effectiveCost,
    balance,
    afterBalance: Math.max(0, afterBalance),
    ok,
    freeForTraveler,
    label: ENDPOINT_LABELS[endpoint],
    reason: ok ? undefined : "QUOTA",
  };
}

export {
  PROMO_GRANT_TTL_DAYS,
  LOYALTY_GRANT_TTL_DAYS,
  BACKFILL_GRANT_AMOUNT,
  BACKFILL_GRANT_TTL_DAYS,
  WELCOME_GRANT_AMOUNT,
  WELCOME_GRANT_TTL_DAYS,
};
