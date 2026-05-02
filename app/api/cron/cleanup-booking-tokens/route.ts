import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Nightly cleanup of dead-weight columns on old bookings.
 *
 * Targets COMPLETED/CANCELLED bookings, or CONFIRMED bookings whose travelDate is >7 days past:
 * - ticketToken: one-time access token, useless after travel done; privacy risk to keep
 * - viatorBookingError: only relevant during 6h retry window
 * - snapToken / idempotencyKey: belt-and-braces (also cleared on CONFIRMED)
 *
 * Safe to run daily. Authorized by CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const secret = process.env.CRON_SECRET || "default_secret";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const result = await prisma.booking.updateMany({
      where: {
        OR: [
          { status: "COMPLETED" },
          { status: "CANCELLED" },
          { AND: [{ status: "CONFIRMED" }, { travelDate: { lt: sevenDaysAgo } }] },
        ],
      },
      data: {
        ticketToken: null,
        viatorBookingError: null,
        snapToken: null,
        idempotencyKey: null,
        viatorRetryCount: 0,
      },
    });

    return NextResponse.json({
      success: true,
      cleared: result.count,
      message: `Cleared dead-weight tokens on ${result.count} old bookings.`,
    });
  } catch (error: any) {
    console.error("[Cron: cleanup-booking-tokens]", error?.message);
    return NextResponse.json(
      { error: "Failed to cleanup booking tokens" },
      { status: 500 }
    );
  }
}
