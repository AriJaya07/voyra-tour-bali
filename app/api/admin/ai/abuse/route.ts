import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/ai/abuse?range=24h|7d|30d
 *
 * Suspicious activity hot-list for the operator dashboard:
 *  - Top guest IP hashes by call count + denied count
 *  - Top users by 24h spend velocity (catch leaked credentials / scripts)
 *  - DENIED_QUOTA repeats per user (potential frustration / abuse signal)
 *
 * ADMIN-only.
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

    const range = req.nextUrl.searchParams.get("range") ?? "24h";
    const hours = ({ "24h": 24, "7d": 24 * 7, "30d": 24 * 30 } as Record<string, number>)[range] ?? 24;
    const since = new Date(Date.now() - hours * 60 * 60_000);

    const [guestIps, userVelocity, deniedRepeats, totalDenials] = await Promise.all([
      // Guest IP hot-list (userId == null)
      prisma.aiUsage.groupBy({
        by: ["ipHash"],
        where: { createdAt: { gte: since }, userId: null, ipHash: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { ipHash: "desc" } },
        take: 20,
      }),
      // User spend velocity (high-volume callers)
      prisma.aiUsage.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: since }, userId: { not: null }, status: "OK" },
        _sum: { creditsCost: true },
        _count: { _all: true },
        orderBy: { _sum: { creditsCost: "desc" } },
        take: 20,
      }),
      // DENIED_QUOTA repeats (per user)
      prisma.aiUsage.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: since }, status: "DENIED_QUOTA", userId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { userId: "desc" } },
        take: 20,
      }),
      prisma.aiUsage.count({ where: { createdAt: { gte: since }, status: "DENIED_QUOTA" } }),
    ]);

    // Resolve user metadata
    const userIds = Array.from(
      new Set([
        ...userVelocity.map((u) => u.userId).filter((id): id is number => typeof id === "number"),
        ...deniedRepeats.map((u) => u.userId).filter((id): id is number => typeof id === "number"),
      ])
    );
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, name: true, role: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    return NextResponse.json({
      range,
      since: since.toISOString(),
      totalDenials,
      guestIps: guestIps.map((g) => ({
        ipHashPrefix: g.ipHash?.slice(0, 8) ?? null,
        calls: g._count._all,
      })),
      userVelocity: userVelocity.map((v) => ({
        userId: v.userId,
        email: v.userId ? userMap.get(v.userId)?.email ?? null : null,
        name: v.userId ? userMap.get(v.userId)?.name ?? null : null,
        role: v.userId ? userMap.get(v.userId)?.role ?? null : null,
        creditsSpent: v._sum.creditsCost ?? 0,
        calls: v._count._all,
      })),
      deniedRepeats: deniedRepeats.map((d) => ({
        userId: d.userId,
        email: d.userId ? userMap.get(d.userId)?.email ?? null : null,
        denials: d._count._all,
      })),
    });
  } catch (error) {
    console.error("Error fetching AI abuse list:", error);
    return NextResponse.json({ error: "Failed to fetch abuse list" }, { status: 500 });
  }
}
