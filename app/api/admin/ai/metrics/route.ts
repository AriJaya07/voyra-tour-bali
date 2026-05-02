import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/ai/metrics?range=7d|30d|90d
 *
 * Returns aggregated AI usage + credit economy metrics for the admin dashboard.
 * ADMIN role only.
 */

function parseRange(raw: string | null): { since: Date; label: string } {
  const map: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
  const days = map[raw ?? ""] ?? 30;
  return {
    since: new Date(Date.now() - days * 86_400_000),
    label: `${days}d`,
  };
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

    const { since, label } = parseRange(req.nextUrl.searchParams.get("range"));

    const [
      usageByEndpoint,
      usageByStatus,
      topSpenders,
      walletAggregate,
      grantBySource,
      activeSubs,
      ledgerSpend,
      guestUsage,
    ] = await Promise.all([
      prisma.aiUsage.groupBy({
        by: ["endpoint"],
        where: { createdAt: { gte: since } },
        _count: true,
        _sum: { creditsCost: true, tokensIn: true, tokensOut: true, durationMs: true },
      }),
      prisma.aiUsage.groupBy({
        by: ["status"],
        where: { createdAt: { gte: since } },
        _count: true,
      }),
      prisma.aiUsage.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: since }, userId: { not: null }, status: "OK" },
        _sum: { creditsCost: true },
        orderBy: { _sum: { creditsCost: "desc" } },
        take: 20,
      }),
      prisma.aiCreditWallet.aggregate({
        _sum: { balance: true, lifetimeEarned: true, lifetimeSpent: true },
        _count: true,
      }),
      prisma.aiCreditGrant.groupBy({
        by: ["source"],
        where: { grantedAt: { gte: since } },
        _count: true,
        _sum: { amount: true, remaining: true },
      }),
      prisma.aiSubscription.groupBy({
        by: ["plan", "status"],
        _count: true,
      }),
      prisma.aiCreditLedger.aggregate({
        where: { createdAt: { gte: since }, delta: { lt: 0 } },
        _sum: { delta: true },
      }),
      prisma.aiUsage.count({
        where: { createdAt: { gte: since }, userId: null },
      }),
    ]);

    // Resolve top spender names
    const userIds = topSpenders
      .map((t) => t.userId)
      .filter((id): id is number => typeof id === "number");
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, name: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    return NextResponse.json({
      range: label,
      since: since.toISOString(),
      usageByEndpoint: usageByEndpoint.map((u) => ({
        endpoint: u.endpoint,
        calls: u._count,
        creditsSpent: u._sum.creditsCost ?? 0,
        tokensIn: u._sum.tokensIn ?? 0,
        tokensOut: u._sum.tokensOut ?? 0,
        avgDurationMs:
          u._count > 0 && u._sum.durationMs ? Math.round((u._sum.durationMs ?? 0) / u._count) : 0,
      })),
      usageByStatus: usageByStatus.map((u) => ({ status: u.status, count: u._count })),
      topSpenders: topSpenders.map((t) => ({
        userId: t.userId,
        email: t.userId ? userMap.get(t.userId)?.email ?? null : null,
        name: t.userId ? userMap.get(t.userId)?.name ?? null : null,
        creditsSpent: t._sum.creditsCost ?? 0,
      })),
      wallets: {
        totalUsers: walletAggregate._count,
        balanceTotal: walletAggregate._sum.balance ?? 0,
        lifetimeEarned: walletAggregate._sum.lifetimeEarned ?? 0,
        lifetimeSpent: walletAggregate._sum.lifetimeSpent ?? 0,
      },
      grantsInRange: grantBySource.map((g) => ({
        source: g.source,
        count: g._count,
        granted: g._sum.amount ?? 0,
        stillRemaining: g._sum.remaining ?? 0,
      })),
      subscriptions: activeSubs.map((s) => ({
        plan: s.plan,
        status: s.status,
        count: s._count,
      })),
      creditsSpentInRange: -(ledgerSpend._sum.delta ?? 0),
      guestCalls: guestUsage,
    });
  } catch (error) {
    console.error("Error fetching AI metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI metrics" },
      { status: 500 }
    );
  }
}
