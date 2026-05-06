import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Cron: EmailDelivery retention sweep.
 *
 * Deletes rows older than 180 days. Open-pixel + click-redirect rows live in the
 * same table — keep recent for funnel analytics, drop old.
 *
 * Authorized by CRON_SECRET. Supports ?dryRun=1.
 */

const RETENTION_DAYS = 180;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const secret = process.env.CRON_SECRET || "default_secret";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";

  try {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000);
    const where = {
      OR: [
        { sentAt: { lt: cutoff } },
        { sentAt: null, createdAt: { lt: cutoff } },
      ],
    };

    if (dryRun) {
      const c = await prisma.emailDelivery.count({ where });
      return NextResponse.json({ dryRun: true, wouldDelete: c, retentionDays: RETENTION_DAYS });
    }

    const result = await prisma.emailDelivery.deleteMany({ where });
    return NextResponse.json({
      success: true,
      deleted: result.count,
      retentionDays: RETENTION_DAYS,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("[Cron: cleanup-email-delivery]", msg);
    return NextResponse.json({ error: "Failed to cleanup email-delivery" }, { status: 500 });
  }
}
