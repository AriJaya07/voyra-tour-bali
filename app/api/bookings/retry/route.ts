import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { retryFailedViatorBookings } from "@/lib/services/viatorRecoveryService";

/**
 * POST /api/bookings/retry
 * Retry failed Viator bookings (payment succeeded but Viator call failed).
 * Admin-only endpoint. Shares its logic with the daily
 * /api/cron/viator-failed-recovery job via viatorRecoveryService.
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const results = await retryFailedViatorBookings(10);

    if (results.length === 0) {
      return NextResponse.json({ message: "No failed bookings to retry", retried: 0 });
    }

    return NextResponse.json({ message: "Retry complete", retried: results.length, results });
  } catch (error) {
    console.error("Retry error:", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json({ error: "Retry failed" }, { status: 500 });
  }
}
