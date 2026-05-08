import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Cron: TrustedDevice retention sweep.
 *
 * Deletes devices whose `expiresAt` has elapsed. The cookie token is already
 * useless past expiry — keeping the row only bloats the table.
 *
 * Authorized by CRON_SECRET. Supports ?dryRun=1.
 */

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const secret = process.env.CRON_SECRET || "default_secret";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";

  try {
    const where = { expiresAt: { lt: new Date() } };

    if (dryRun) {
      const wouldDelete = await prisma.trustedDevice.count({ where });
      return NextResponse.json({ dryRun: true, wouldDelete });
    }

    const result = await prisma.trustedDevice.deleteMany({ where });
    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("[Cron: cleanup-trusted-devices]", msg);
    return NextResponse.json({ error: "Failed to cleanup trusted devices" }, { status: 500 });
  }
}
