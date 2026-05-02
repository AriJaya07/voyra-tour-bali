import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/ai/funnel?range=30d
 *
 * Operator-grade funnel for the welcome → subscribe pipeline.
 * Stages:
 *  1. signups in window (User.createdAt)
 *  2. of those, how many got a welcome grant
 *  3. of those, how many actually called any AI endpoint (status=OK)
 *  4. of those, how many used >= 50% of their welcome bucket
 *  5. of those, how many subscribed within 30d of signup
 *
 * Plus per-bucket distribution of credits in circulation.
 */

function parseRange(raw: string | null): { since: Date; days: number } {
  const map: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90, "180d": 180 };
  const days = map[raw ?? ""] ?? 30;
  return { since: new Date(Date.now() - days * 86_400_000), days };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { since, days } = parseRange(req.nextUrl.searchParams.get("range"));

    // Stage 1 — signups in window
    const signups = await prisma.user.findMany({
      where: { createdAt: { gte: since } },
      select: { id: true, createdAt: true, aiWelcomeGrantedAt: true },
    });
    const signupCount = signups.length;
    const signupIds = signups.map((u) => u.id);

    // Stage 2 — welcome granted
    const welcomeGrantedCount = signups.filter((u) => u.aiWelcomeGrantedAt != null).length;

    // Stage 3 — AI activity (any OK call)
    const callers = signupIds.length
      ? await prisma.aiUsage.groupBy({
          by: ["userId"],
          where: { userId: { in: signupIds }, status: "OK" },
          _count: true,
        })
      : [];
    const callerSet = new Set(callers.map((c) => c.userId).filter((id): id is number => typeof id === "number"));

    // Stage 4 — burned >= 50% of welcome
    let halfBurnedCount = 0;
    if (signupIds.length) {
      const welcomeGrants = await prisma.aiCreditGrant.findMany({
        where: { userId: { in: signupIds }, source: "WELCOME" },
        select: { userId: true, amount: true, remaining: true },
      });
      for (const g of welcomeGrants) {
        const burned = g.amount - g.remaining;
        if (burned >= g.amount / 2) halfBurnedCount++;
      }
    }

    // Stage 5 — subscribed (any non-FREE active sub created within 30d of signup)
    const subscribers = signupIds.length
      ? await prisma.aiSubscription.findMany({
          where: {
            userId: { in: signupIds },
            status: { in: ["ACTIVE", "GRACE", "CANCELLED"] },
            plan: { not: "FREE" },
          },
          select: { userId: true, createdAt: true },
        })
      : [];
    const signupMap = new Map(signups.map((u) => [u.id, u.createdAt]));
    const convertedCount = subscribers.filter((s) => {
      const signupAt = signupMap.get(s.userId);
      if (!signupAt) return false;
      return s.createdAt.getTime() - signupAt.getTime() <= 30 * 86_400_000;
    }).length;

    // Per-bucket distribution of *currently live* credits
    const liveGrantAggregates = await prisma.aiCreditGrant.groupBy({
      by: ["source"],
      where: { remaining: { gt: 0 }, expiresAt: { gt: new Date() } },
      _sum: { remaining: true },
      _count: true,
    });
    const bucketDistribution = liveGrantAggregates.map((g) => ({
      source: g.source,
      grants: g._count,
      credits: g._sum.remaining ?? 0,
    }));

    // Refund rate over the same window
    const [paidPayments, refundedPayments] = await Promise.all([
      prisma.aiPayment.count({ where: { status: "PAID", paidAt: { gte: since } } }),
      prisma.aiPayment.count({ where: { status: "REFUNDED", updatedAt: { gte: since } } }),
    ]);
    const refundRate = paidPayments > 0 ? (refundedPayments / paidPayments) : 0;

    return NextResponse.json({
      range: `${days}d`,
      since: since.toISOString(),
      funnel: {
        signups: signupCount,
        welcomeGranted: welcomeGrantedCount,
        firstAiCall: callerSet.size,
        halfBurnedWelcome: halfBurnedCount,
        convertedToPaid: convertedCount,
        conversionPct: signupCount > 0 ? +((convertedCount / signupCount) * 100).toFixed(2) : 0,
        activationPct: signupCount > 0 ? +((callerSet.size / signupCount) * 100).toFixed(2) : 0,
      },
      bucketDistribution,
      payments: {
        paidInRange: paidPayments,
        refundedInRange: refundedPayments,
        refundRatePct: +(refundRate * 100).toFixed(2),
      },
    });
  } catch (error) {
    console.error("Error fetching AI funnel:", error);
    return NextResponse.json({ error: "Failed to fetch funnel" }, { status: 500 });
  }
}
