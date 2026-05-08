import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Cron: Referral retention sweep.
 *
 * Deletes never-acted-on referrals older than 180d:
 *   - status PENDING (invitee never signed up)
 *   - status DECLINED
 *
 * SIGNED_UP / ACTIVE are kept indefinitely (live attribution + reward state).
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
      status: { in: ["PENDING", "DECLINED"] },
      createdAt: { lt: cutoff },
      bookingsCount: 0,
    };

    if (dryRun) {
      const wouldDelete = await prisma.referral.count({ where });
      return NextResponse.json({ dryRun: true, wouldDelete });
    }

    const result = await prisma.referral.deleteMany({ where });
    return NextResponse.json({
      success: true,
      deleted: result.count,
      retention: { days: RETENTION_DAYS },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("[Cron: cleanup-referrals]", msg);
    return NextResponse.json({ error: "Failed to cleanup referrals" }, { status: 500 });
  }
}
