import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import { createSubscriptionPayment } from "@/lib/services/aiPaymentService";
import { getPaymentGateway } from "@/lib/services/paymentGateway";
import { AI_PLANS, type AiPlanKey } from "@/lib/config/aiPlans";
import crypto from "crypto";

const PERIOD_DAYS = 30;

async function getContact(
  userId: number,
  sessionEmail?: string | null,
  sessionName?: string | null
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, phone: true },
  });
  const fullName = (user?.name ?? sessionName ?? "").trim();
  const [firstName, ...rest] = fullName.length > 0 ? fullName.split(/\s+/) : ["Guest"];
  return {
    firstName: firstName || "Guest",
    lastName: rest.join(" "),
    email: user?.email ?? sessionEmail ?? "",
    phone: user?.phone ?? "",
  };
}

/**
 * GET /api/ai/subscription
 * Returns current AiSubscription row (or null).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);
    const sub = await prisma.aiSubscription.findUnique({ where: { userId } });
    return NextResponse.json({ subscription: sub });
  } catch (error) {
    console.error("Error fetching AI subscription:", error);
    return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 });
  }
}

/**
 * POST /api/ai/subscription  Body: { plan }
 * Issues a Snap token for a NEW subscription (or restart of EXPIRED/CANCELLED).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const body = await req.json().catch(() => ({}));
    const planKey = typeof body?.plan === "string" ? (body.plan as AiPlanKey) : null;
    if (!planKey || !(planKey in AI_PLANS) || planKey === "FREE") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const siteUrl = process.env.NEXTAUTH_URL;
    if (!siteUrl) {
      return NextResponse.json(
        { error: "Server misconfiguration: NEXTAUTH_URL is not set" },
        { status: 500 }
      );
    }

    const contact = await getContact(userId, session.user.email, session.user.name);
    const result = await createSubscriptionPayment({
      userId,
      plan: planKey,
      kind: "SUBSCRIPTION_NEW",
      contact,
      siteUrl,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "Subscription payment failed" },
        { status: 409 }
      );
    }

    return NextResponse.json({
      paymentId: result.paymentId,
      snapToken: result.snapToken,
      redirectUrl: result.redirectUrl,
      amountIdr: result.amountIdr,
      plan: planKey,
    });
  } catch (error) {
    console.error("Error creating AI subscription:", error);
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
  }
}

/**
 * PATCH /api/ai/subscription  Body: { plan }
 *
 * Upgrade — prorate price + immediately grant prorated extra credits + flip plan after payment.
 * Downgrade — store as pendingPlanKey; renewal cron applies at next period start.
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const body = await req.json().catch(() => ({}));
    const newPlan = typeof body?.plan === "string" ? (body.plan as AiPlanKey) : null;
    if (!newPlan || !(newPlan in AI_PLANS) || newPlan === "FREE") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const sub = await prisma.aiSubscription.findUnique({ where: { userId } });
    if (!sub || (sub.status !== "ACTIVE" && sub.status !== "GRACE")) {
      return NextResponse.json(
        { error: "No active subscription. Use POST to start a new one." },
        { status: 409 }
      );
    }

    const oldDef = AI_PLANS[sub.plan as AiPlanKey];
    const newDef = AI_PLANS[newPlan];
    if (newPlan === sub.plan && !sub.pendingPlanKey) {
      return NextResponse.json({ error: "Already on this plan" }, { status: 400 });
    }

    const now = new Date();
    const periodEnd = sub.currentPeriodEnd > now ? sub.currentPeriodEnd : new Date(now.getTime() + PERIOD_DAYS * 86_400_000);
    const daysLeft = Math.max(1, Math.ceil((periodEnd.getTime() - now.getTime()) / 86_400_000));

    // ── Downgrade path: defer until renewal ──
    if (newDef.priceIdr < oldDef.priceIdr) {
      await prisma.aiSubscription.update({
        where: { userId },
        data: { pendingPlanKey: newPlan },
      });
      return NextResponse.json({
        message: `Downgrade to ${newDef.label} will apply at next renewal.`,
        deferred: true,
        nextRenewalAt: periodEnd,
        pendingPlanKey: newPlan,
      });
    }

    // ── Upgrade path: prorate + Snap charge ──
    const proratedIdr = Math.max(1000, Math.round(((newDef.priceIdr - oldDef.priceIdr) * daysLeft) / 30));
    const proratedCredits = Math.max(
      0,
      Math.floor(((newDef.monthlyCredits - oldDef.monthlyCredits) * daysLeft) / 30)
    );

    const siteUrl = process.env.NEXTAUTH_URL;
    if (!siteUrl) {
      return NextResponse.json(
        { error: "Server misconfiguration: NEXTAUTH_URL is not set" },
        { status: 500 }
      );
    }

    const contact = await getContact(userId, session.user.email, session.user.name);
    const idempotencyKey = crypto
      .createHash("sha256")
      .update(`${userId}|UPGRADE|${newPlan}|${Math.floor(now.getTime() / 60_000)}`)
      .digest("hex")
      .slice(0, 32);

    const placeholder = `AISUB-PEND-UPG-${idempotencyKey.slice(0, 12)}`;
    const row = await prisma.aiPayment.create({
      data: {
        userId,
        kind: "SUBSCRIPTION_NEW", // reuse handler — extends period & flips plan/snapshot to newPlan
        plan: newPlan,
        creditsToGrant: proratedCredits,
        amountIdr: proratedIdr,
        paymentId: placeholder,
        idempotencyKey,
        status: "PENDING",
      },
    });

    const orderId = `AISUB-${row.id}-${Date.now()}`;
    const gateway = getPaymentGateway();
    const gatewayResult = await gateway.createTransaction({
      orderId,
      grossAmount: proratedIdr,
      itemDetails: [
        {
          id: `AISUB-UPG-${newPlan}`,
          name: `Voyra AI upgrade → ${newDef.label} (prorated ${daysLeft}d)`.slice(0, 50),
          price: proratedIdr,
          quantity: 1,
        },
      ],
      customerDetails: contact,
      callbackUrls: {
        success: `${siteUrl}/profile/ai?status=success`,
        pending: `${siteUrl}/profile/ai?status=pending`,
        error: `${siteUrl}/profile/ai?status=error`,
      },
    });

    await prisma.aiPayment.update({
      where: { id: row.id },
      data: { paymentId: orderId, snapToken: gatewayResult.token ?? null },
    });

    return NextResponse.json({
      paymentId: orderId,
      snapToken: gatewayResult.token,
      redirectUrl: gatewayResult.redirectUrl,
      amountIdr: proratedIdr,
      proratedCredits,
      daysLeft,
      plan: newPlan,
    });
  } catch (error) {
    console.error("Error changing AI subscription:", error);
    return NextResponse.json({ error: "Failed to change subscription" }, { status: 500 });
  }
}
