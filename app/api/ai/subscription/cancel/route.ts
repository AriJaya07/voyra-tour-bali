import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/ai/subscription/cancel
 *
 * Marks the active subscription to cancel at period end. Credits + benefits
 * stay until currentPeriodEnd, then renewal cron sees autoRenew=false and lets
 * it expire to FREE.
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const sub = await prisma.aiSubscription.findUnique({ where: { userId } });
    if (!sub) {
      return NextResponse.json({ error: "No subscription" }, { status: 404 });
    }
    if (sub.status !== "ACTIVE" && sub.status !== "GRACE") {
      return NextResponse.json({ error: `Cannot cancel from ${sub.status}` }, { status: 409 });
    }

    const updated = await prisma.aiSubscription.update({
      where: { userId },
      data: {
        cancelAtPeriodEnd: true,
        autoRenew: false,
      },
    });

    return NextResponse.json({
      message: `Subscription will end on ${updated.currentPeriodEnd.toISOString()}.`,
      subscription: updated,
    });
  } catch (error) {
    console.error("Error cancelling AI subscription:", error);
    return NextResponse.json({ error: "Failed to cancel" }, { status: 500 });
  }
}
