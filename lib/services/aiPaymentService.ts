/**
 * AI Payment Service
 *
 * Handles Midtrans payment lifecycle for AI subscriptions + top-up packs.
 * Mirrors the booking-payment shape so /api/payment/notification can dispatch
 * by AiPayment.paymentId prefix (AISUB- / AITOP-).
 */

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getPaymentGateway } from "@/lib/services/paymentGateway";
import {
  AI_PACKS,
  AI_PLANS,
  type AiPackKey,
  type AiPlanKey,
} from "@/lib/config/aiPlans";
import {
  grantSubscriptionPeriod,
  grantTopupPack,
} from "@/lib/services/aiCreditService";

const PERIOD_DAYS = 30;

export type AiPaymentKind = "SUBSCRIPTION_NEW" | "SUBSCRIPTION_RENEWAL" | "TOPUP";

interface UserContact {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

interface CreatePaymentResult {
  ok: boolean;
  paymentId?: string;
  snapToken?: string | null;
  redirectUrl?: string | null;
  amountIdr?: number;
  error?: string;
}

function buildOrderId(kind: AiPaymentKind, paymentRowId: number): string {
  const prefix = kind === "TOPUP" ? "AITOP" : "AISUB";
  return `${prefix}-${paymentRowId}-${Date.now()}`;
}

function buildIdempotencyKey(userId: number, kind: AiPaymentKind, key: string): string {
  return crypto
    .createHash("sha256")
    .update(`${userId}|${kind}|${key}|${Date.now()}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Create a Midtrans Snap transaction for a top-up pack.
 */
export async function createTopupPayment(params: {
  userId: number;
  pack: AiPackKey;
  contact: UserContact;
  siteUrl: string;
}): Promise<CreatePaymentResult> {
  const def = AI_PACKS[params.pack];
  if (!def) return { ok: false, error: "Unknown pack" };

  const idempotencyKey = buildIdempotencyKey(params.userId, "TOPUP", def.key);

  // Phase 1: insert AiPayment in PENDING with placeholder paymentId
  const placeholder = `AITOP-PENDING-${idempotencyKey}`;
  const row = await prisma.aiPayment.create({
    data: {
      userId: params.userId,
      kind: "TOPUP",
      pack: def.key,
      creditsToGrant: def.credits,
      amountIdr: def.priceIdr,
      paymentId: placeholder,
      idempotencyKey,
      status: "PENDING",
    },
  });

  const orderId = buildOrderId("TOPUP", row.id);
  const gateway = getPaymentGateway();
  let gatewayResult;
  try {
    gatewayResult = await gateway.createTransaction({
      orderId,
      grossAmount: def.priceIdr,
      itemDetails: [
        {
          id: `AITOP-${def.key}`,
          name: `AI Credits ${def.label} (${def.credits} credits)`.slice(0, 50),
          price: def.priceIdr,
          quantity: 1,
        },
      ],
      customerDetails: params.contact,
      callbackUrls: {
        success: `${params.siteUrl}/profile/ai?status=success`,
        pending: `${params.siteUrl}/profile/ai?status=pending`,
        error: `${params.siteUrl}/profile/ai?status=error`,
      },
    });
  } catch (e) {
    await prisma.aiPayment.update({
      where: { id: row.id },
      data: { status: "FAILED" },
    });
    return { ok: false, error: e instanceof Error ? e.message : "Gateway failed" };
  }

  await prisma.aiPayment.update({
    where: { id: row.id },
    data: {
      paymentId: orderId,
      snapToken: gatewayResult.token ?? null,
    },
  });

  return {
    ok: true,
    paymentId: orderId,
    snapToken: gatewayResult.token ?? null,
    redirectUrl: gatewayResult.redirectUrl ?? null,
    amountIdr: def.priceIdr,
  };
}

/**
 * Create a Midtrans Snap transaction for a subscription (new or renewal).
 * For NEW: creates AiSubscription in PENDING_PAYMENT alongside AiPayment.
 * For RENEWAL: existing AiSubscription stays ACTIVE/GRACE; payment extends period on success.
 */
export async function createSubscriptionPayment(params: {
  userId: number;
  plan: AiPlanKey;
  kind: "SUBSCRIPTION_NEW" | "SUBSCRIPTION_RENEWAL";
  contact: UserContact;
  siteUrl: string;
}): Promise<CreatePaymentResult> {
  const def = AI_PLANS[params.plan];
  if (!def) return { ok: false, error: "Unknown plan" };
  if (def.priceIdr === 0) return { ok: false, error: "Free plan does not require payment" };

  const idempotencyKey = buildIdempotencyKey(params.userId, params.kind, def.key);

  // Phase 1 placeholder
  const row = await prisma.aiPayment.create({
    data: {
      userId: params.userId,
      kind: params.kind,
      plan: def.key,
      creditsToGrant: def.monthlyCredits,
      amountIdr: def.priceIdr,
      paymentId: `AISUB-PENDING-${idempotencyKey}`,
      idempotencyKey,
      status: "PENDING",
    },
  });

  // For NEW subscriptions, ensure the AiSubscription row exists in PENDING_PAYMENT.
  if (params.kind === "SUBSCRIPTION_NEW") {
    const existing = await prisma.aiSubscription.findUnique({
      where: { userId: params.userId },
    });
    if (existing && (existing.status === "ACTIVE" || existing.status === "GRACE")) {
      // Already subscribed — caller should use change-plan flow instead.
      await prisma.aiPayment.update({
        where: { id: row.id },
        data: { status: "FAILED" },
      });
      return { ok: false, error: "Active subscription exists; use plan-change flow" };
    }
    const now = new Date();
    const periodEnd = new Date(now.getTime() + PERIOD_DAYS * 86_400_000);
    await prisma.aiSubscription.upsert({
      where: { userId: params.userId },
      update: {
        plan: def.key,
        status: "PENDING_PAYMENT",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        priceIdr: def.priceIdr,
        monthlyCredits: def.monthlyCredits,
        carryoverDays: def.carryoverDays,
        carryoverCap: def.carryoverCap,
        autoRenew: true,
        cancelAtPeriodEnd: false,
        failedRenewals: 0,
      },
      create: {
        userId: params.userId,
        plan: def.key,
        status: "PENDING_PAYMENT",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        priceIdr: def.priceIdr,
        monthlyCredits: def.monthlyCredits,
        carryoverDays: def.carryoverDays,
        carryoverCap: def.carryoverCap,
        autoRenew: true,
      },
    });
  }

  const orderId = buildOrderId(params.kind, row.id);
  const gateway = getPaymentGateway();
  let gatewayResult;
  try {
    gatewayResult = await gateway.createTransaction({
      orderId,
      grossAmount: def.priceIdr,
      itemDetails: [
        {
          id: `AISUB-${def.key}`,
          name: `Voyra AI ${def.label} (monthly)`.slice(0, 50),
          price: def.priceIdr,
          quantity: 1,
        },
      ],
      customerDetails: params.contact,
      callbackUrls: {
        success: `${params.siteUrl}/profile/ai?status=success`,
        pending: `${params.siteUrl}/profile/ai?status=pending`,
        error: `${params.siteUrl}/profile/ai?status=error`,
      },
    });
  } catch (e) {
    await prisma.aiPayment.update({
      where: { id: row.id },
      data: { status: "FAILED" },
    });
    return { ok: false, error: e instanceof Error ? e.message : "Gateway failed" };
  }

  await prisma.aiPayment.update({
    where: { id: row.id },
    data: {
      paymentId: orderId,
      snapToken: gatewayResult.token ?? null,
    },
  });

  return {
    ok: true,
    paymentId: orderId,
    snapToken: gatewayResult.token ?? null,
    redirectUrl: gatewayResult.redirectUrl ?? null,
    amountIdr: def.priceIdr,
  };
}

/**
 * Apply a successful AI payment: idempotently grants credits + extends sub.
 * Called by /api/payment/notification when paymentId starts with AITOP-/AISUB-.
 */
export async function handleAiPaymentSuccess(orderId: string): Promise<{ success: boolean; error?: string }> {
  const payment = await prisma.aiPayment.findUnique({ where: { paymentId: orderId } });
  if (!payment) return { success: false, error: "AiPayment not found" };

  if (payment.status === "PAID") {
    return { success: true }; // already processed
  }

  if (payment.kind === "TOPUP") {
    if (!payment.pack) return { success: false, error: "Pack missing" };
    await grantTopupPack(payment.userId, payment.pack as AiPackKey, orderId);
    await prisma.aiPayment.update({
      where: { id: payment.id },
      data: { status: "PAID", paidAt: new Date(), snapToken: null },
    });
    console.log(`[AI Payment] TOPUP ${orderId} → granted ${payment.creditsToGrant} credits to user ${payment.userId}`);
    return { success: true };
  }

  if (payment.kind === "SUBSCRIPTION_NEW" || payment.kind === "SUBSCRIPTION_RENEWAL") {
    if (!payment.plan) return { success: false, error: "Plan missing" };
    const planKey = payment.plan as AiPlanKey;

    const sub = await prisma.aiSubscription.findUnique({ where: { userId: payment.userId } });
    const now = new Date();
    const baseStart = sub && sub.currentPeriodEnd > now ? sub.currentPeriodEnd : now;
    const newEnd = new Date(baseStart.getTime() + PERIOD_DAYS * 86_400_000);
    const planDef = AI_PLANS[planKey];

    await prisma.aiSubscription.upsert({
      where: { userId: payment.userId },
      update: {
        plan: planKey,
        status: "ACTIVE",
        currentPeriodStart: baseStart,
        currentPeriodEnd: newEnd,
        priceIdr: planDef.priceIdr,
        monthlyCredits: planDef.monthlyCredits,
        carryoverDays: planDef.carryoverDays,
        carryoverCap: planDef.carryoverCap,
        lastRenewalAt: new Date(),
        nextRenewalAt: newEnd,
        failedRenewals: 0,
        cancelAtPeriodEnd: false,
        pendingPlanKey: null,
      },
      create: {
        userId: payment.userId,
        plan: planKey,
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: newEnd,
        priceIdr: planDef.priceIdr,
        monthlyCredits: planDef.monthlyCredits,
        carryoverDays: planDef.carryoverDays,
        carryoverCap: planDef.carryoverCap,
        lastRenewalAt: new Date(),
        nextRenewalAt: newEnd,
        autoRenew: true,
      },
    });

    await grantSubscriptionPeriod(payment.userId, planKey, orderId);
    await prisma.aiPayment.update({
      where: { id: payment.id },
      data: { status: "PAID", paidAt: new Date(), snapToken: null },
    });
    console.log(`[AI Payment] ${payment.kind} ${orderId} → granted ${planDef.monthlyCredits} credits, period ${baseStart.toISOString()} → ${newEnd.toISOString()}`);
    return { success: true };
  }

  return { success: false, error: `Unknown kind: ${payment.kind}` };
}

/**
 * Apply a failed/cancelled status to an AI payment.
 */
export async function handleAiPaymentFailure(orderId: string, terminal: "FAILED" | "EXPIRED"): Promise<void> {
  const payment = await prisma.aiPayment.findUnique({ where: { paymentId: orderId } });
  if (!payment) return;
  if (payment.status === "PAID") return; // never downgrade paid

  await prisma.aiPayment.update({
    where: { id: payment.id },
    data: { status: terminal },
  });

  // For NEW subscription that never paid → drop the PENDING_PAYMENT row back
  if (payment.kind === "SUBSCRIPTION_NEW") {
    await prisma.aiSubscription
      .updateMany({
        where: { userId: payment.userId, status: "PENDING_PAYMENT" },
        data: { status: "EXPIRED" },
      })
      .catch(() => {});
  }
}

/** Determine if a Midtrans paymentId belongs to the AI subsystem. */
export function isAiPaymentId(orderId: string): boolean {
  return orderId.startsWith("AISUB-") || orderId.startsWith("AITOP-");
}
