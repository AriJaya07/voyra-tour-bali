import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Cron: Newsletter Subscription retention sweep.
 *
 * Deletes UNSUBSCRIBED rows older than 365d. Active subscriptions are kept
 * indefinitely. Some jurisdictions require a suppression list — operators
 * relying on Brevo's own list-unsubscribe / suppression do not need to keep
 * these rows locally.
 *
 * Authorized by CRON_SECRET. Supports ?dryRun=1.
 */

const RETENTION_DAYS = 365;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const secret = process.env.CRON_SECRET || "default_secret";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";

  try {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000);
    const where = { status: "UNSUBSCRIBED", updatedAt: { lt: cutoff } };

    if (dryRun) {
      const wouldDelete = await prisma.subscription.count({ where });
      return NextResponse.json({ dryRun: true, wouldDelete });
    }

    const result = await prisma.subscription.deleteMany({ where });
    return NextResponse.json({
      success: true,
      deleted: result.count,
      retention: { days: RETENTION_DAYS },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("[Cron: cleanup-newsletter-subscriptions]", msg);
    return NextResponse.json({ error: "Failed to cleanup newsletter subs" }, { status: 500 });
  }
}
