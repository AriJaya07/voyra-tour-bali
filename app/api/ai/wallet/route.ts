import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import { getWalletSummary } from "@/lib/services/aiCreditService";
import { AI_PLANS } from "@/lib/config/aiPlans";

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

    const [summary, subscription, recentGrants] = await Promise.all([
      getWalletSummary(userId),
      prisma.aiSubscription.findUnique({ where: { userId } }),
      prisma.aiCreditGrant.findMany({
        where: { userId, remaining: { gt: 0 } },
        orderBy: { expiresAt: "asc" },
        take: 10,
        select: {
          id: true,
          source: true,
          amount: true,
          remaining: true,
          grantedAt: true,
          expiresAt: true,
        },
      }),
    ]);

    const planDef = AI_PLANS[summary.plan];

    return NextResponse.json(
      {
        balance: summary.balance,
        lifetimeEarned: summary.lifetimeEarned,
        lifetimeSpent: summary.lifetimeSpent,
        expiringIn7d: summary.expiringIn7d,
        plan: summary.plan,
        planLabel: planDef.label,
        planFeatures: planDef.features,
        subscription: subscription
          ? {
              status: subscription.status,
              currentPeriodEnd: subscription.currentPeriodEnd,
              cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
              autoRenew: subscription.autoRenew,
              nextRenewalAt: subscription.nextRenewalAt,
            }
          : null,
        grants: recentGrants,
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
