import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Nightly safety-net for RecentlyViewedItem.
 *
 * The /api/recently-viewed POST already deletes >24h rows for the active user,
 * but inactive users accumulate orphan rows forever. This cron sweeps them globally.
 *
 * Authorized by CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const secret = process.env.CRON_SECRET || "default_secret";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await prisma.recentlyViewedItem.deleteMany({
      where: { viewedAt: { lt: cutoff } },
    });
    return NextResponse.json({
      success: true,
      deleted: result.count,
      message: `Deleted ${result.count} expired recently-viewed rows.`,
    });
  } catch (error: any) {
    console.error("[Cron: cleanup-recently-viewed]", error?.message);
    return NextResponse.json(
      { error: "Failed to cleanup recently-viewed" },
      { status: 500 }
    );
  }
}
