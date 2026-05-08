import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/db-stats
 *
 * Heavy-table observability for admins. Returns row counts + oldest-row dates
 * for tables with retention policies, so growth can be monitored from the UI
 * without psql access.
 *
 * ADMIN role only.
 */

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  if (session.user.role !== "ADMIN") return null;
  return session;
}

type TableStat = {
  key: string;
  label: string;
  count: number;
  oldest: string | null;
  retention: string;
};

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [
      aiUsageCount,
      aiUsageOldest,
      ledgerCount,
      ledgerOldest,
      appNotifCount,
      appNotifOldest,
      emailCount,
      emailOldest,
      recentlyViewedCount,
      recentlyViewedOldest,
      chatMemoryCount,
      bookingCount,
      auditLogCount,
      auditLogOldest,
      twoFactorChallengeCount,
      twoFactorChallengeOldest,
      trustedDeviceCount,
      trustedDeviceExpired,
      newsletterCount,
      newsletterUnsubscribed,
      referralCount,
      referralStaleOldest,
      operatorCount,
      operatorRejected,
      imageCount,
      imageOrphans,
    ] = await Promise.all([
      prisma.aiUsage.count(),
      prisma.aiUsage.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
      prisma.aiCreditLedger.count(),
      prisma.aiCreditLedger.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
      prisma.appNotification.count(),
      prisma.appNotification.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
      prisma.emailDelivery.count(),
      prisma.emailDelivery.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
      prisma.recentlyViewedItem.count(),
      prisma.recentlyViewedItem.findFirst({ orderBy: { viewedAt: "asc" }, select: { viewedAt: true } }),
      prisma.aiChatMemory.count(),
      prisma.booking.count(),
      prisma.auditLog.count(),
      prisma.auditLog.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
      prisma.twoFactorChallenge.count(),
      prisma.twoFactorChallenge.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
      prisma.trustedDevice.count(),
      prisma.trustedDevice.count({ where: { expiresAt: { lt: new Date() } } }),
      prisma.subscription.count(),
      prisma.subscription.count({ where: { status: "UNSUBSCRIBED" } }),
      prisma.referral.count(),
      prisma.referral.findFirst({
        where: { status: { in: ["PENDING", "DECLINED"] } },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
      prisma.operator.count(),
      prisma.operator.count({ where: { status: "REJECTED" } }),
      prisma.image.count(),
      prisma.image.count({
        where: {
          destinationId: null,
          packageId: null,
          contentId: null,
          locationId: null,
        },
      }),
    ]);

    const tables: TableStat[] = [
      {
        key: "auditLog",
        label: "Audit Log",
        count: auditLogCount,
        oldest: auditLogOldest?.createdAt?.toISOString() ?? null,
        retention: "Security >365d, low-value >90d purged",
      },
      {
        key: "twoFactorChallenge",
        label: "2FA Challenges",
        count: twoFactorChallengeCount,
        oldest: twoFactorChallengeOldest?.createdAt?.toISOString() ?? null,
        retention: "Unverified >7d, verified/consumed >30d purged",
      },
      {
        key: "trustedDevice",
        label: `Trusted Devices (${trustedDeviceExpired} expired)`,
        count: trustedDeviceCount,
        oldest: null,
        retention: "Expired devices purged on cron",
      },
      {
        key: "aiUsage",
        label: "AI Usage",
        count: aiUsageCount,
        oldest: aiUsageOldest?.createdAt?.toISOString() ?? null,
        retention: "Raw rows >90d purged daily by ai-usage-rollup",
      },
      {
        key: "aiCreditLedger",
        label: "AI Credit Ledger",
        count: ledgerCount,
        oldest: ledgerOldest?.createdAt?.toISOString() ?? null,
        retention: "Closed rows >180d, plain >365d, consumed grants >180d",
      },
      {
        key: "appNotification",
        label: "App Notifications",
        count: appNotifCount,
        oldest: appNotifOldest?.createdAt?.toISOString() ?? null,
        retention: "Dismissed >30d, read >90d, unread >180d purged",
      },
      {
        key: "emailDelivery",
        label: "Email Delivery",
        count: emailCount,
        oldest: emailOldest?.createdAt?.toISOString() ?? null,
        retention: "Rows >180d purged by cleanup-email-delivery",
      },
      {
        key: "recentlyViewed",
        label: "Recently Viewed",
        count: recentlyViewedCount,
        oldest: recentlyViewedOldest?.viewedAt?.toISOString() ?? null,
        retention: "24h TTL + per-user cap of 12 items",
      },
      {
        key: "newsletterSubscription",
        label: `Newsletter (${newsletterUnsubscribed} unsubscribed)`,
        count: newsletterCount,
        oldest: null,
        retention: "UNSUBSCRIBED rows >365d purged",
      },
      {
        key: "referral",
        label: "Referrals",
        count: referralCount,
        oldest: referralStaleOldest?.createdAt?.toISOString() ?? null,
        retention: "PENDING/DECLINED with no bookings >180d purged",
      },
      {
        key: "operator",
        label: `Operators (${operatorRejected} rejected)`,
        count: operatorCount,
        oldest: null,
        retention: "REJECTED rows >365d purged",
      },
      {
        key: "image",
        label: `Images (${imageOrphans} orphan)`,
        count: imageCount,
        oldest: null,
        retention: "Orphans (no owner FK) >7d purged + S3 unlinked",
      },
      {
        key: "aiChatMemory",
        label: "AI Chat Memory",
        count: chatMemoryCount,
        oldest: null,
        retention: "Self-capped to 20 turns + 12 notes per user on write",
      },
      {
        key: "booking",
        label: "Bookings (reference)",
        count: bookingCount,
        oldest: null,
        retention: "No purge — kept indefinitely (financial record)",
      },
    ];

    return NextResponse.json({ tables, fetchedAt: new Date().toISOString() });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("Error fetching db-stats:", msg);
    return NextResponse.json({ error: "Failed to fetch DB stats" }, { status: 500 });
  }
}
