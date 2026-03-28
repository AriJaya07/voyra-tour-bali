import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { VIATOR_API_KEY } from "@/lib/config/viator";
import {
  fetchModifiedBookings,
  fetchBookingStatuses,
  acknowledgeBookingModifications,
} from "@/lib/services/viatorSyncService";

/**
 * GET /api/cron/viator-sync
 *
 * Cron job to sync booking status changes from Viator.
 * Run every 6 hours. Uses /bookings/modified-since + /bookings/status.
 * Acknowledges processed modifications so they don't repeat.
 *
 * vercel.json:
 *   path: /api/cron/viator-sync, schedule: every 6 hours
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!VIATOR_API_KEY) {
      return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    }

    // Look back 7 hours to safely cover 6-hour intervals
    const modifiedSince = new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString();

    console.log(`[BOOKING SYNC] Checking modifications since ${modifiedSince}`);

    // Step 1: Find modified bookings
    const refs = await fetchModifiedBookings(modifiedSince);

    console.log(`[BOOKING SYNC] Found ${refs.length} modified bookings`);

    if (refs.length === 0) {
      return NextResponse.json({ success: true, syncedCount: 0 });
    }

    // Step 2: Fetch current statuses
    const statuses = await fetchBookingStatuses(refs);

    // Step 3: Update our database
    let updatedCount = 0;
    for (const s of statuses) {
      if (!s.bookingRef || !s.status) continue;

      const mapped = mapViatorStatus(s.status);
      if (!mapped) continue;

      const result = await prisma.booking.updateMany({
        where: { bookingRef: s.bookingRef },
        data: { status: mapped },
      });

      if (result.count > 0) updatedCount++;
    }

    console.log(`[BOOKING SYNC] Updated ${updatedCount} bookings in DB`);

    // Step 4: Acknowledge so Viator stops returning these
    const acknowledged = await acknowledgeBookingModifications(refs);

    console.log(`[BOOKING SYNC] Acknowledged: ${acknowledged}`);

    return NextResponse.json({
      success: true,
      syncedCount: updatedCount,
      acknowledged,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[BOOKING SYNC] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Map Viator booking status to our BookingStatus enum.
 */
function mapViatorStatus(
  viatorStatus: string
): "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | null {
  switch (viatorStatus.toUpperCase()) {
    case "CONFIRMED":
    case "RECONFIRMED":
      return "CONFIRMED";
    case "PENDING":
      return "PENDING";
    case "CANCELLED":
    case "REJECTED":
      return "CANCELLED";
    case "COMPLETED":
      return "COMPLETED";
    default:
      return null;
  }
}
