import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Daily weather check for users with imported trips in the next 3 days
 * who have opted in to weather alerts.
 *
 * Stub: BMKG/openweather integration TODO. Returns count of trips that
 * would receive an alert today.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const secret = process.env.CRON_SECRET || "default_secret";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  const in3 = new Date();
  in3.setDate(today.getDate() + 3);

  const optedIn = await prisma.notificationPref.findMany({
    where: { weatherAlerts: true },
    select: { userId: true },
  });
  const userIds = optedIn.map((p) => p.userId);
  if (userIds.length === 0) {
    return NextResponse.json({ ok: true, eligible: 0, skipped: "no opt-ins" });
  }

  const upcoming = await prisma.importedTrip.findMany({
    where: {
      userId: { in: userIds },
      travelDate: { gte: today, lte: in3 },
    },
    select: { id: true, userId: true, productTitle: true, travelDate: true },
  });

  // TODO: query weather for each travelDate; if rain/storm, send email
  return NextResponse.json({
    ok: true,
    eligibleUsers: userIds.length,
    upcomingTrips3d: upcoming.length,
    note: "Weather feed not yet wired. Stub returns scope only.",
  });
}
