import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clawbackBookingRewards } from "@/lib/services/rewardService";

/**
 * Cron: defensive net for booking → CANCELLED transitions that bypassed the
 * webhook clawback path (manual admin status flip, retried webhooks, etc.).
 *
 * Runs hourly. Picks bookings updated in the last 90 minutes whose status is
 * CANCELLED and that still have non-zero BOOKING/REFERRAL grants tied to
 * their bookingRef. Idempotent — clawback handler zeros remaining and exits
 * cleanly when there's nothing to reclaim.
 *
 * Headers: Authorization: Bearer ${CRON_SECRET}
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const since = new Date(Date.now() - 90 * 60_000);

    // Bookings recently flipped to CANCELLED with possible outstanding grants.
    const cancelled = await prisma.booking.findMany({
      where: {
        status: "CANCELLED",
        updatedAt: { gte: since },
      },
      take: 200,
    });

    let swept = 0;
    let totalReclaimed = 0;

    for (const booking of cancelled) {
      // Quick check: any active grant tied to this bookingRef?
      const refIds = [
        `BOOKING_${booking.bookingRef}`,
        `REF_${booking.bookingRef}`,
        `REF_THANKYOU_${booking.bookingRef}`,
      ];
      const liveGrant = await prisma.aiCreditGrant.findFirst({
        where: { refId: { in: refIds }, remaining: { gt: 0 } },
        select: { id: true },
      });
      if (!liveGrant) continue;

      const result = await clawbackBookingRewards(booking);
      if (result.reclaimed > 0) {
        swept++;
        totalReclaimed += result.reclaimed;
      }
    }

    return NextResponse.json({
      checked: cancelled.length,
      swept,
      totalReclaimed,
    });
  } catch (error) {
    console.error("Error in booking clawback cron:", error);
    return NextResponse.json({ error: "Clawback sweep failed" }, { status: 500 });
  }
}
