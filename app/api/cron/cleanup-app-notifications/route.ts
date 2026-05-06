import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Cron: AppNotification retention sweep.
 *
 *   - dismissed >30d  → delete (user actively cleared)
 *   - read      >90d  → delete (acknowledged, low value)
 *   - unread    >180d → delete (truly stale)
 *
 * Authorized by CRON_SECRET. Supports ?dryRun=1.
 */

const DISMISSED_DAYS = 30;
const READ_DAYS = 90;
const UNREAD_DAYS = 180;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const secret = process.env.CRON_SECRET || "default_secret";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";

  try {
    const now = Date.now();
    const dismissedCutoff = new Date(now - DISMISSED_DAYS * 86_400_000);
    const readCutoff = new Date(now - READ_DAYS * 86_400_000);
    const unreadCutoff = new Date(now - UNREAD_DAYS * 86_400_000);

    const wDismissed = { dismissedAt: { not: null, lt: dismissedCutoff } };
    const wRead = { readAt: { not: null, lt: readCutoff }, dismissedAt: null };
    const wUnread = { readAt: null, createdAt: { lt: unreadCutoff } };

    if (dryRun) {
      const [d, r, u] = await Promise.all([
        prisma.appNotification.count({ where: wDismissed }),
        prisma.appNotification.count({ where: wRead }),
        prisma.appNotification.count({ where: wUnread }),
      ]);
      return NextResponse.json({
        dryRun: true,
        wouldDeleteDismissed: d,
        wouldDeleteRead: r,
        wouldDeleteUnread: u,
      });
    }

    const [d, r, u] = await Promise.all([
      prisma.appNotification.deleteMany({ where: wDismissed }),
      prisma.appNotification.deleteMany({ where: wRead }),
      prisma.appNotification.deleteMany({ where: wUnread }),
    ]);

    return NextResponse.json({
      success: true,
      deletedDismissed: d.count,
      deletedRead: r.count,
      deletedUnread: u.count,
      retention: { dismissedDays: DISMISSED_DAYS, readDays: READ_DAYS, unreadDays: UNREAD_DAYS },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("[Cron: cleanup-app-notifications]", msg);
    return NextResponse.json({ error: "Failed to cleanup notifications" }, { status: 500 });
  }
}
