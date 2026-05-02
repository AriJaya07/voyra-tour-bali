import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSubscriptionPayment } from "@/lib/services/aiPaymentService";
import { sendNotificationEmail } from "@/lib/email";
import { AI_PLANS, type AiPlanKey } from "@/lib/config/aiPlans";

/**
 * Cron: AI subscription renewals.
 *
 * Runs daily 02:00 WITA. Picks subscriptions whose currentPeriodEnd has lapsed
 * (or is within the next 24h) and that have autoRenew=true. For each, issues a
 * Midtrans Snap renewal payment + emails the user with the link. Failed
 * renewals tick failedRenewals and move ACTIVE → GRACE; the grace-sweep cron
 * later flushes long-grace rows to EXPIRED.
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
    const horizon = new Date(now.getTime() + 24 * 60 * 60_000); // include "due tomorrow"

    const due = await prisma.aiSubscription.findMany({
      where: {
        autoRenew: true,
        cancelAtPeriodEnd: false,
        status: { in: ["ACTIVE", "GRACE"] },
        currentPeriodEnd: { lte: horizon },
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
      take: 200,
    });

    const siteUrl = process.env.NEXTAUTH_URL ?? "";
    let initiated = 0;
    let cancelledByUser = 0;
    let downgradedToFree = 0;
    let failed = 0;

    for (const sub of due) {
      // If user flagged cancel after we last looked, respect it.
      if (sub.cancelAtPeriodEnd) {
        cancelledByUser++;
        await prisma.aiSubscription.update({
          where: { userId: sub.userId },
          data: { status: "EXPIRED" },
        });
        continue;
      }

      // Apply pending plan change at renewal moment.
      const targetPlanKey: AiPlanKey =
        (sub.pendingPlanKey as AiPlanKey | null) ?? (sub.plan as AiPlanKey);

      // FREE target = downgrade-to-free; close the subscription cleanly.
      if (targetPlanKey === "FREE") {
        await prisma.aiSubscription.update({
          where: { userId: sub.userId },
          data: { status: "EXPIRED", pendingPlanKey: null },
        });
        downgradedToFree++;
        continue;
      }

      const fullName = (sub.user.name ?? "").trim();
      const [firstName, ...rest] = fullName.length > 0 ? fullName.split(/\s+/) : ["Guest"];

      const result = await createSubscriptionPayment({
        userId: sub.userId,
        plan: targetPlanKey,
        kind: "SUBSCRIPTION_RENEWAL",
        contact: {
          firstName: firstName || "Guest",
          lastName: rest.join(" "),
          email: sub.user.email,
          phone: sub.user.phone ?? "",
        },
        siteUrl,
      });

      if (!result.ok || !result.snapToken) {
        failed++;
        await prisma.aiSubscription.update({
          where: { userId: sub.userId },
          data: {
            status: "GRACE",
            failedRenewals: { increment: 1 },
          },
        });
        continue;
      }

      initiated++;
      const planLabel = AI_PLANS[targetPlanKey].label;

      // Send renewal payment email — user clicks link → Snap → webhook → activate
      sendNotificationEmail({
        to: sub.user.email,
        userName: fullName || "there",
        title: `Voyra AI ${planLabel} — renew now`,
        body: `Your **${planLabel}** subscription is up for renewal. Click below to extend for another month and receive **${result.amountIdr ? `Rp ${result.amountIdr.toLocaleString("id-ID")}`: ""}** worth of new credits.`,
        url: `${siteUrl}/profile/ai?status=renew&token=${encodeURIComponent(result.snapToken)}`,
      }).catch((e) => console.error("[Renewals] email failed:", e?.message ?? e));
    }

    return NextResponse.json({
      checked: due.length,
      initiated,
      cancelledByUser,
      downgradedToFree,
      failed,
    });
  } catch (error) {
    console.error("Error in AI subscription renewals cron:", error);
    return NextResponse.json({ error: "Renewal cron failed" }, { status: 500 });
  }
}
