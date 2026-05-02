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
  subscriptionGrantTtlDays,
  type AiPackKey,
  type AiPlanKey,
} from "@/lib/config/aiPlans";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GrantSource =
  | "SUBSCRIPTION"
  | "TOPUP"
  | "PROMO"
  | "REFERRAL"
  | "LOYALTY_REDEEM"
  | "REFUND"
  | "ADJUST"
  | "BACKFILL";

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

export {
  PROMO_GRANT_TTL_DAYS,
  LOYALTY_GRANT_TTL_DAYS,
  BACKFILL_GRANT_AMOUNT,
  BACKFILL_GRANT_TTL_DAYS,
};
