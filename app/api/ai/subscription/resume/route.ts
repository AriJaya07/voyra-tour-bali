import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/ai/subscription/resume
 *
 * Reverses a pending cancel-at-period-end. Only valid before the period ends.
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
    if (!sub.cancelAtPeriodEnd) {
      return NextResponse.json({ error: "Subscription is not pending cancellation" }, { status: 409 });
    }
    if (sub.currentPeriodEnd <= new Date()) {
      return NextResponse.json(
        { error: "Period already ended; create a new subscription instead." },
        { status: 409 }
      );
    }

    const updated = await prisma.aiSubscription.update({
      where: { userId },
      data: { cancelAtPeriodEnd: false, autoRenew: true },
    });

    return NextResponse.json({
      message: "Subscription resumed; will renew at period end.",
      subscription: updated,
    });
  } catch (error) {
    console.error("Error resuming AI subscription:", error);
    return NextResponse.json({ error: "Failed to resume" }, { status: 500 });
  }
}
