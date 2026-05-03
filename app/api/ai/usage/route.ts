import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/ai/usage?range=7d|30d|90d&limit=30
 *
 * Returns the signed-in user's most recent AI calls. Totals are derived
 * client-side from the same sample to avoid a per-request groupBy scan.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const range = req.nextUrl.searchParams.get("range") ?? "7d";
    const limit = Math.min(30, parseInt(req.nextUrl.searchParams.get("limit") ?? "30"));
    const days = ({ "7d": 7, "30d": 30, "90d": 90 } as Record<string, number>)[range] ?? 7;
    const since = new Date(Date.now() - days * 86_400_000);

    const usage = await prisma.aiUsage.findMany({
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
    });

    return new NextResponse(
      JSON.stringify({
        range,
        since: since.toISOString(),
        usage,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, max-age=60",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching AI usage:", error);
    return NextResponse.json({ error: "Failed to fetch usage" }, { status: 500 });
  }
}
