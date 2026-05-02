import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNotificationEmail } from "@/lib/email";

/**
 * Cron: AI subscription grace sweep.
 *
 * Runs hourly. Subscriptions stuck in GRACE for >72h are flushed to EXPIRED
 * (downgrade to FREE). User keeps any remaining top-up credits — only
 * subscription-tier features are revoked.
 *
 * Headers: Authorization: Bearer ${CRON_SECRET}
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cutoff = new Date(Date.now() - 72 * 60 * 60_000);

    const stale = await prisma.aiSubscription.findMany({
      where: {
        status: "GRACE",
        currentPeriodEnd: { lt: cutoff },
      },
      include: { user: { select: { name: true, email: true } } },
    });

    if (stale.length === 0) {
      return NextResponse.json({ swept: 0 });
    }

    const ids = stale.map((s) => s.userId);
    await prisma.aiSubscription.updateMany({
      where: { userId: { in: ids } },
      data: {
        status: "EXPIRED",
        autoRenew: false,
        cancelAtPeriodEnd: false,
      },
    });

    // Notify each user (best-effort)
    const siteUrl = process.env.NEXTAUTH_URL ?? "";
    for (const sub of stale) {
      sendNotificationEmail({
        to: sub.user.email,
        userName: (sub.user.name ?? "").trim() || "there",
        title: "Voyra AI subscription paused",
        body: `We couldn't process your renewal payment within 3 days. Your subscription has been paused — your top-up credits are safe and you're back on the Free plan. Resume anytime to unlock the planner and concierge features.`,
        url: `${siteUrl}/plans`,
      }).catch((e) => console.error("[GraceSweep] email failed:", e?.message ?? e));
    }

    return NextResponse.json({ swept: stale.length, userIds: ids });
  } catch (error) {
    console.error("Error in AI grace sweep cron:", error);
    return NextResponse.json({ error: "Grace sweep failed" }, { status: 500 });
  }
}
