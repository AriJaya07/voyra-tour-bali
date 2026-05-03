import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import {
  ensureWelcomeGrant,
  getCreditBuckets,
  getWalletSummary,
} from "@/lib/services/aiCreditService";
import { AI_PLANS, translateCredits } from "@/lib/config/aiPlans";

/**
 * GET /api/ai/wallet
 *
 * Returns the signed-in user's AI credit wallet, current subscription, and
 * a peek at upcoming expiries.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    // Lazy welcome-grant guarantee on first wallet read. Idempotent — skips when
    // already granted or legacy backfill user. Keeps onboarding bulletproof if
    // the register/signIn hook ever drops the call.
    await ensureWelcomeGrant(userId).catch(() => {});

    const [summary, subscription, buckets] = await Promise.all([
      getWalletSummary(userId),
      prisma.aiSubscription.findUnique({ where: { userId } }),
      getCreditBuckets(userId),
    ]);

    const planDef = AI_PLANS[summary.plan];
    const translation = translateCredits(summary.balance);

    // Credit-only gating: any signed-in user with credits can use chat, plan,
    // plan_refine, concierge, cultural, dayOfTrip, voucherRead. Subscription-
    // exclusive perks (familySeats seat count, priorityRouting) stay anchored
    // to the user's actual plan.
    const planFeatures = {
      plan: true,
      planMaxDays: 14,
      saveItineraries: planDef.features.saveItineraries > 0 ? planDef.features.saveItineraries : 5,
      concierge: true,
      dayOfTrip: true,
      cultural: true,
      voucherRead: true,
      familySeats: planDef.features.familySeats,
      priorityRouting: planDef.features.priorityRouting,
    };

    // Flatten the soonest-expiring grant (across all buckets) for hero callouts.
    const upcomingExpiry = buckets
      .flatMap((b) => b.grants)
      .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))[0] ?? null;

    return NextResponse.json(
      {
        balance: summary.balance,
        lifetimeEarned: summary.lifetimeEarned,
        lifetimeSpent: summary.lifetimeSpent,
        expiringIn7d: summary.expiringIn7d,
        plan: summary.plan,
        planLabel: planDef.label,
        planFeatures,
        translation,
        subscription: subscription
          ? {
              plan: subscription.plan,
              status: subscription.status,
              currentPeriodStart: subscription.currentPeriodStart,
              currentPeriodEnd: subscription.currentPeriodEnd,
              cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
              autoRenew: subscription.autoRenew,
              nextRenewalAt: subscription.nextRenewalAt,
              priceIdr: subscription.priceIdr,
              monthlyCredits: subscription.monthlyCredits,
              pendingPlanKey: subscription.pendingPlanKey,
            }
          : null,
        buckets,
        // Legacy field kept for backwards-compat with v1 wallet UI consumers.
        grants: buckets
          .flatMap((b) => b.grants.map((g) => ({ ...g, source: b.source })))
          .slice(0, 10),
        soonestExpiry: upcomingExpiry,
      },
      {
        headers: { "Cache-Control": "private, max-age=15" },
      }
    );
  } catch (error) {
    console.error("Error fetching AI wallet:", error);
    return NextResponse.json({ error: "Failed to fetch wallet" }, { status: 500 });
  }
}
