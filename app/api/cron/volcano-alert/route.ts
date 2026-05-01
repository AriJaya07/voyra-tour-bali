import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Daily check for volcano alerts (Mt Agung, Mt Batur).
 *
 * Stub: PVMBG/BNPB integration TODO. For now, scans for users opted-in
 * with upcoming trips, returns counts. Wire actual alert payload when
 * external feed selected.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const secret = process.env.CRON_SECRET || "default_secret";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const next30 = new Date();
  next30.setDate(next30.getDate() + 30);

  const optedIn = await prisma.notificationPref.findMany({
    where: { volcanoAlerts: true },
    select: { userId: true },
  });
  const userIds = optedIn.map((p) => p.userId);
  if (userIds.length === 0) {
    return NextResponse.json({ ok: true, eligible: 0, skipped: "no opt-ins" });
  }

  const tripsCount = await prisma.importedTrip.count({
    where: {
      userId: { in: userIds },
      travelDate: { gte: new Date(), lte: next30 },
    },
  });

  // TODO: hook PVMBG/BNPB feed; if elevated alert, send email via lib/email
  return NextResponse.json({
    ok: true,
    eligibleUsers: userIds.length,
    upcomingTrips30d: tripsCount,
    note: "External volcano feed not yet wired. Stub returns scope only.",
  });
}
