import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/ai/usage?range=7d|30d|90d&limit=50
 *
 * Returns the signed-in user's recent AI calls + a small ledger preview.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const range = req.nextUrl.searchParams.get("range") ?? "30d";
    const limit = Math.min(100, parseInt(req.nextUrl.searchParams.get("limit") ?? "50"));
    const days = ({ "7d": 7, "30d": 30, "90d": 90 } as Record<string, number>)[range] ?? 30;
    const since = new Date(Date.now() - days * 86_400_000);

    const [usage, ledger, totals] = await Promise.all([
      prisma.aiUsage.findMany({
        where: { userId, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          endpoint: true,
          creditsCost: true,
          tokensIn: true,
          tokensOut: true,
          status: true,
          durationMs: true,
          createdAt: true,
        },
      }),
      prisma.aiCreditLedger.findMany({
        where: { userId, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          delta: true,
          reason: true,
          reservationStatus: true,
          createdAt: true,
        },
      }),
      prisma.aiUsage.groupBy({
        by: ["endpoint"],
        where: { userId, createdAt: { gte: since }, status: "OK" },
        _sum: { creditsCost: true },
        _count: true,
      }),
    ]);

    return NextResponse.json({
      range,
      since: since.toISOString(),
      usage,
      ledger,
      totals: totals.map((t) => ({
        endpoint: t.endpoint,
        calls: t._count,
        creditsSpent: t._sum.creditsCost ?? 0,
      })),
    });
  } catch (error) {
    console.error("Error fetching AI usage:", error);
    return NextResponse.json({ error: "Failed to fetch usage" }, { status: 500 });
  }
}
