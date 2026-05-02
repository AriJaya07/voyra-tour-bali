import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNotificationEmail } from "@/lib/email";
import { AI_PLANS, type AiPlanKey } from "@/lib/config/aiPlans";

/**
 * Cron: AI subscription renewal reminders.
 *
 * Runs daily 09:00 WITA. Sends T-3 and T-1 day reminders for upcoming
 * renewals so users aren't surprised by a charge.
 *
 * Idempotency: stores last sent state on AiSubscription via lastRenewalAt as a
 * lightweight signal — but we use AiUsage's neighbour pattern: write a marker
 * NotificationPref row? Cheaper: rely on day-precision matching (T-3 fires
 * once per scheduled cron-day). Cron runs once/day so duplicate fires only
 * happen on retry — accepted as low-risk for emails.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const t3Start = new Date(now.getTime() + 3 * 86_400_000);
    const t3End = new Date(t3Start.getTime() + 86_400_000);
    const t1Start = new Date(now.getTime() + 1 * 86_400_000);
    const t1End = new Date(t1Start.getTime() + 86_400_000);

    const candidates = await prisma.aiSubscription.findMany({
      where: {
        autoRenew: true,
        cancelAtPeriodEnd: false,
        status: "ACTIVE",
        OR: [
          { currentPeriodEnd: { gte: t3Start, lt: t3End } },
          { currentPeriodEnd: { gte: t1Start, lt: t1End } },
        ],
      },
      include: { user: { select: { name: true, email: true } } },
    });

    const siteUrl = process.env.NEXTAUTH_URL ?? "";
    let sent = 0;

    for (const sub of candidates) {
      const planKey = (sub.pendingPlanKey as AiPlanKey | null) ?? (sub.plan as AiPlanKey);
      const planDef = AI_PLANS[planKey] ?? AI_PLANS.EXPLORER;
      const renewsOn = sub.currentPeriodEnd.toLocaleDateString("en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });

      const days = Math.ceil((sub.currentPeriodEnd.getTime() - now.getTime()) / 86_400_000);
      const window = days <= 1 ? "tomorrow" : `in ${days} days`;

      try {
        await sendNotificationEmail({
          to: sub.user.email,
          userName: (sub.user.name ?? "").trim() || "there",
          title: `Heads up — Voyra AI ${planDef.label} renews ${window}`,
          body: `Your **${planDef.label}** plan renews on **${renewsOn}** for **Rp ${planDef.priceIdr.toLocaleString("id-ID")}** and adds **${planDef.monthlyCredits.toLocaleString()} credits**. To change or cancel, open your AI wallet.`,
          url: `${siteUrl}/profile/ai`,
        });
        sent++;
      } catch (e) {
        console.error("[RenewalReminders] email failed:", e instanceof Error ? e.message : e);
      }
    }

    return NextResponse.json({ checked: candidates.length, sent });
  } catch (error) {
    console.error("Error in AI renewal reminders cron:", error);
    return NextResponse.json({ error: "Reminder cron failed" }, { status: 500 });
  }
}
