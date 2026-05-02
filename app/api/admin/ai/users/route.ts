import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/ai/users?search=&page=1&limit=20&sort=spend|balance|earned&range=30d
 *
 * Operator dashboard: per-user AI spend + wallet snapshot. Joins User + wallet
 * + most recent subscription + spend in window. ADMIN-only.
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

    const sp = req.nextUrl.searchParams;
    const search = (sp.get("search") ?? "").trim().toLowerCase();
    const page = Math.max(1, parseInt(sp.get("page") ?? "1"));
    const limit = Math.min(100, parseInt(sp.get("limit") ?? "20"));
    const sort = sp.get("sort") ?? "spend";
    const range = sp.get("range") ?? "30d";
    const days = ({ "7d": 7, "30d": 30, "90d": 90 } as Record<string, number>)[range] ?? 30;
    const since = new Date(Date.now() - days * 86_400_000);

    // Aggregate spend per user in window
    const aggregates = await prisma.aiUsage.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: since }, userId: { not: null } },
      _sum: { creditsCost: true },
      _count: true,
    });
    const spendMap = new Map<number, { spent: number; calls: number }>();
    for (const a of aggregates) {
      if (a.userId != null) {
        spendMap.set(a.userId, { spent: a._sum.creditsCost ?? 0, calls: a._count });
      }
    }

    // Build base user query (search + paginate)
    const userWhere = search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" as const } },
            { name: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const totalUsers = await prisma.user.count({ where: userWhere });

    // Fetch a wider slice when sorting by computed columns; trim later
    const fetchTake = sort === "spend" || sort === "calls" ? Math.max(limit * 5, 200) : limit;
    const users = await prisma.user.findMany({
      where: userWhere,
      orderBy:
        sort === "earned"
          ? { aiWallet: { lifetimeEarned: "desc" } }
          : sort === "balance"
          ? { aiWallet: { balance: "desc" } }
          : { createdAt: "desc" },
      include: {
        aiWallet: true,
        aiSubscription: { select: { plan: true, status: true, currentPeriodEnd: true } },
      },
      take: fetchTake,
      skip: sort === "spend" || sort === "calls" ? 0 : (page - 1) * limit,
    });

    let rows = users.map((u) => {
      const spend = spendMap.get(u.id);
      return {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        plan: u.aiSubscription?.plan ?? "FREE",
        subStatus: u.aiSubscription?.status ?? null,
        periodEnd: u.aiSubscription?.currentPeriodEnd ?? null,
        balance: u.aiWallet?.balance ?? 0,
        lifetimeEarned: u.aiWallet?.lifetimeEarned ?? 0,
        lifetimeSpent: u.aiWallet?.lifetimeSpent ?? 0,
        windowSpent: spend?.spent ?? 0,
        windowCalls: spend?.calls ?? 0,
      };
    });

    if (sort === "spend") {
      rows = rows.sort((a, b) => b.windowSpent - a.windowSpent);
    } else if (sort === "calls") {
      rows = rows.sort((a, b) => b.windowCalls - a.windowCalls);
    }
    rows = rows.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      page,
      limit,
      total: totalUsers,
      range,
      since: since.toISOString(),
      rows,
    });
  } catch (error) {
    console.error("Error fetching AI admin users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
