import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/ai/referral-fraud?range=7d
 *
 * Suspicious-pattern report for the per-booking referral system. ADMIN-only.
 *
 * Surfaces:
 *  - High-volume inviters (>= 5 referral payouts in window)
 *  - Mutual-loop pairs (A invited B, B invited A, both have payouts)
 *  - Phone-hash collisions (multiple users with same phone fingerprint)
 *  - IP-hash collisions (>3 users sharing same signup IP in last 30d)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const range = req.nextUrl.searchParams.get("range") ?? "7d";
    const days = ({ "24h": 1, "7d": 7, "30d": 30 } as Record<string, number>)[range] ?? 7;
    const since = new Date(Date.now() - days * 86_400_000);

    // High-volume inviters
    const heavyInviters = await prisma.aiCreditLedger.groupBy({
      by: ["userId"],
      where: { reason: "GRANT_REFERRAL", createdAt: { gte: since } },
      _count: { _all: true },
      _sum: { delta: true },
      orderBy: { _count: { userId: "desc" } },
      take: 20,
    });

    // Phone-hash collisions
    const phoneCollisions = await prisma.signupFingerprint.groupBy({
      by: ["phoneHash"],
      where: { phoneHash: { not: null } },
      _count: { _all: true },
      having: { phoneHash: { _count: { gt: 1 } } },
      orderBy: { _count: { phoneHash: "desc" } },
      take: 30,
    });

    // IP-hash collisions in last 30d
    const ipSince = new Date(Date.now() - 30 * 86_400_000);
    const ipCollisions = await prisma.signupFingerprint.groupBy({
      by: ["ipHash"],
      where: { ipHash: { not: null }, createdAt: { gte: ipSince } },
      _count: { _all: true },
      having: { ipHash: { _count: { gt: 3 } } },
      orderBy: { _count: { ipHash: "desc" } },
      take: 30,
    });

    // Mutual-loop pairs — referrals where A→B and B→A both exist
    const allReferrals = await prisma.referral.findMany({
      where: { inviteeId: { not: null }, status: { in: ["SIGNED_UP", "ACTIVE"] } },
      select: { inviterId: true, inviteeId: true, totalRewarded: true, bookingsCount: true },
    });
    const refSet = new Set(allReferrals.map((r) => `${r.inviterId}-${r.inviteeId}`));
    const mutualPairs: Array<{ a: number; b: number }> = [];
    for (const r of allReferrals) {
      if (r.inviteeId == null) continue;
      const reverseKey = `${r.inviteeId}-${r.inviterId}`;
      if (refSet.has(reverseKey) && r.inviterId < r.inviteeId) {
        mutualPairs.push({ a: r.inviterId, b: r.inviteeId });
      }
    }

    // Resolve user names for top inviters
    const inviterIds = heavyInviters
      .map((h) => h.userId)
      .filter((id): id is number => typeof id === "number");
    const users = inviterIds.length
      ? await prisma.user.findMany({
          where: { id: { in: inviterIds } },
          select: { id: true, email: true, name: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    return NextResponse.json({
      range,
      since: since.toISOString(),
      heavyInviters: heavyInviters.map((h) => ({
        userId: h.userId,
        email: h.userId ? userMap.get(h.userId)?.email ?? null : null,
        payouts: h._count._all,
        creditsTotal: h._sum.delta ?? 0,
      })),
      phoneCollisions: phoneCollisions.map((p) => ({
        phoneHashPrefix: p.phoneHash?.slice(0, 8) ?? null,
        users: p._count._all,
      })),
      ipCollisions: ipCollisions.map((p) => ({
        ipHashPrefix: p.ipHash?.slice(0, 8) ?? null,
        users: p._count._all,
      })),
      mutualPairs,
    });
  } catch (error) {
    console.error("Error fetching referral fraud:", error);
    return NextResponse.json({ error: "Failed to fetch fraud report" }, { status: 500 });
  }
}
