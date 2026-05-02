import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { expireGrants } from "@/lib/services/aiCreditService";
import { sendNotificationEmail } from "@/lib/email";

/**
 * Cron: AI credit expiry.
 *
 * Runs daily 03:00 WITA. Two phases:
 *  1. Expire — invoke aiCreditService.expireGrants(now). Writes negative
 *     ledger rows for everything past expiresAt.
 *  2. Warn — find grants expiring in 7 days and 1 day with remaining > 0
 *     and email the holder once per window.
 *
 * Headers: Authorization: Bearer ${CRON_SECRET}
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const expired = await expireGrants(now);

    // T-7 / T-1 warning windows (24-hour bucket so each grant warns once).
    const t7Start = new Date(now.getTime() + 7 * 86_400_000);
    const t7End = new Date(t7Start.getTime() + 86_400_000);
    const t1Start = new Date(now.getTime() + 1 * 86_400_000);
    const t1End = new Date(t1Start.getTime() + 86_400_000);

    const warnGrants = await prisma.aiCreditGrant.findMany({
      where: {
        remaining: { gt: 0 },
        OR: [
          { expiresAt: { gte: t7Start, lt: t7End } },
          { expiresAt: { gte: t1Start, lt: t1End } },
        ],
      },
      include: { user: { select: { name: true, email: true } } },
      take: 500,
    });

    const siteUrl = process.env.NEXTAUTH_URL ?? "";
    let warned = 0;

    // Group warnings by user to avoid email spam (one mail per user per cron run).
    const byUser = new Map<number, { user: { name: string | null; email: string }; total: number; soonest: Date }>();
    for (const g of warnGrants) {
      const cur = byUser.get(g.userId);
      if (!cur) {
        byUser.set(g.userId, { user: g.user, total: g.remaining, soonest: g.expiresAt });
      } else {
        cur.total += g.remaining;
        if (g.expiresAt < cur.soonest) cur.soonest = g.expiresAt;
      }
    }

    for (const [, info] of byUser) {
      const days = Math.max(1, Math.ceil((info.soonest.getTime() - now.getTime()) / 86_400_000));
      try {
        await sendNotificationEmail({
          to: info.user.email,
          userName: (info.user.name ?? "").trim() || "there",
          title: `${info.total.toLocaleString()} AI credits expiring in ${days} day${days === 1 ? "" : "s"}`,
          body: `Use them up to plan your next Bali trip — chat, generate itineraries, or refine an existing plan. Unused credits will lapse on **${info.soonest.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}**.`,
          url: `${siteUrl}/profile/ai`,
        });
        warned++;
      } catch (e) {
        console.error("[ExpireCredits] warn email failed:", e instanceof Error ? e.message : e);
      }
    }

    return NextResponse.json({
      expiredCredits: expired.expired,
      expiredGrants: expired.affected,
      warnedUsers: warned,
    });
  } catch (error) {
    console.error("Error in AI expire credits cron:", error);
    return NextResponse.json({ error: "Expiry cron failed" }, { status: 500 });
  }
}
