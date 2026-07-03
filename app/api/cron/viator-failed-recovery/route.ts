import { NextRequest, NextResponse } from "next/server";
import {
  retryFailedViatorBookings,
  alertAdminsOnStuckBookings,
} from "@/lib/services/viatorRecoveryService";

/**
 * Daily cron: recover "payment captured but Viator booking FAILED" bookings.
 * 1. Retry the Viator book call for bookings under the retry cap.
 * 2. Raise an in-app ALERT to every ADMIN for bookings that exhausted retries
 *    — these need manual fulfillment TODAY, before the customer travels.
 * Authorized by CRON_SECRET like every other cron route.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const secret = process.env.CRON_SECRET || "default_secret";

  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await retryFailedViatorBookings(10);
    const stuckAlerted = await alertAdminsOnStuckBookings();

    const recovered = results.filter((r) => r.status === "success").length;
    if (results.length > 0 || stuckAlerted > 0) {
      console.error(
        `[Cron: Viator Recovery] retried=${results.length} recovered=${recovered} stuck=${stuckAlerted}`
      );
    }

    return NextResponse.json({
      success: true,
      retried: results.length,
      recovered,
      stuckAlerted,
      results,
    });
  } catch (error) {
    console.error(
      "[Cron: Viator Recovery Error]",
      error instanceof Error ? error.message : "Unknown"
    );
    return NextResponse.json({ error: "Viator recovery failed" }, { status: 500 });
  }
}
