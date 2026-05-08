import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Cron: Operator retention sweep.
 *
 * Hard-deletes Operator rows in REJECTED status whose `updatedAt` is older
 * than 365d. After a year there is no business reason to keep a rejected
 * application around.
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
    const where = { status: "REJECTED", updatedAt: { lt: cutoff } };

    if (dryRun) {
      const wouldDelete = await prisma.operator.count({ where });
      return NextResponse.json({ dryRun: true, wouldDelete });
    }

    const result = await prisma.operator.deleteMany({ where });
    return NextResponse.json({
      success: true,
      deleted: result.count,
      retention: { days: RETENTION_DAYS },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("[Cron: cleanup-rejected-operators]", msg);
    return NextResponse.json({ error: "Failed to cleanup operators" }, { status: 500 });
  }
}
