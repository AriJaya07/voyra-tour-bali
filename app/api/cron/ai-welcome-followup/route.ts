import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNotificationEmail } from "@/lib/email";

/**
 * Cron: AI welcome-grant follow-up.
 *
 * Runs daily 09:30 UTC. For users whose welcome grant is approaching expiry
 * or already expired without a paid subscription, send the right nudge:
 *   T-3 day → "5 days left, here's what you can do with your credits"
 *   T-1 day → "Last day for welcome credits — subscribe?"
 *   T+1 day after expire and no subscription → "Welcome week ended"
 *
 * Idempotency: each user receives at most one email per phase per grant
 * because (a) cron runs daily and (b) we read the grant's expiresAt window
 * to gate the email — outside ±1 day of the boundary, nothing fires.
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
    const day = 86_400_000;

    const t3Start = new Date(now.getTime() + 3 * day);
    const t3End = new Date(t3Start.getTime() + day);
    const t1Start = new Date(now.getTime() + 1 * day);
    const t1End = new Date(t1Start.getTime() + day);
    const justExpiredStart = new Date(now.getTime() - 1 * day);
    const justExpiredEnd = new Date(now.getTime());

    const [t3Grants, t1Grants, expiredGrants] = await Promise.all([
      prisma.aiCreditGrant.findMany({
        where: {
          source: "WELCOME",
          remaining: { gt: 0 },
          expiresAt: { gte: t3Start, lt: t3End },
        },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.aiCreditGrant.findMany({
        where: {
          source: "WELCOME",
          remaining: { gt: 0 },
          expiresAt: { gte: t1Start, lt: t1End },
        },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.aiCreditGrant.findMany({
        where: {
          source: "WELCOME",
          expiredAt: { gte: justExpiredStart, lt: justExpiredEnd },
        },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
    ]);

    const siteUrl = process.env.NEXTAUTH_URL ?? "";
    let sentT3 = 0;
    let sentT1 = 0;
    let sentExpired = 0;

    async function maybeSend(
      list: typeof t3Grants,
      title: (name: string) => string,
      body: (remaining: number, name: string) => string,
      url: string,
      onSent: () => void,
      requirePaidNone = false
    ) {
      for (const g of list) {
        // Skip if user is already a paid subscriber
        if (requirePaidNone) {
          const sub = await prisma.aiSubscription.findUnique({
            where: { userId: g.user.id },
            select: { status: true, plan: true },
          });
          if (sub && (sub.status === "ACTIVE" || sub.status === "GRACE") && sub.plan !== "FREE") {
            continue;
          }
        }
        const name = (g.user.name ?? "").trim() || "there";
        try {
          await sendNotificationEmail({
            to: g.user.email,
            userName: name,
            title: title(name),
            body: body(g.remaining, name),
            url,
          });
          onSent();
        } catch (e) {
          console.error("[WelcomeFollowup] email failed:", e instanceof Error ? e.message : e);
        }
      }
    }

    await maybeSend(
      t3Grants,
      () => "Your welcome credits expire in 3 days",
      (remaining) =>
        `You still have **${remaining} AI credits**. Use them to plan a Bali itinerary, ask the assistant a question, or save a tour. They expire in 3 days — make them count.`,
      `${siteUrl}/profile/ai/tools`,
      () => sentT3++,
      true
    );

    await maybeSend(
      t1Grants,
      () => "Last day for your welcome credits",
      (remaining) =>
        `Heads up — your **${remaining} welcome credits** expire tomorrow. Subscribers get a fresh batch every month, valid 365 days each. **Rp 49,000** unlocks the AI itinerary planner + 300 credits/month with Explorer.`,
      `${siteUrl}/plans`,
      () => sentT1++,
      true
    );

    await maybeSend(
      expiredGrants,
      () => "Welcome week ended — keep your AI sidekick",
      () =>
        `Your welcome credits have expired. Subscribers keep their credits for 365 days from grant — way more breathing room. **Explorer** is Rp 49,000/mo for 300 credits + the planner. Cancel anytime.`,
      `${siteUrl}/plans`,
      () => sentExpired++,
      true
    );

    return NextResponse.json({
      sentT3,
      sentT1,
      sentExpired,
      checked: { t3: t3Grants.length, t1: t1Grants.length, expired: expiredGrants.length },
    });
  } catch (error) {
    console.error("Error in AI welcome followup cron:", error);
    return NextResponse.json({ error: "Welcome followup failed" }, { status: 500 });
  }
}
