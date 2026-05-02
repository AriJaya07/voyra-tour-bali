import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Daily: find bookings/trips where travelDate was exactly 365 days ago.
 * Queue a "trip anniversary" email — re-engagement.
 *
 * Stub — records EmailDelivery rows; actual ESP send TODO.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const secret = process.env.CRON_SECRET || "default_secret";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const oneYearAgoStart = new Date(today);
  oneYearAgoStart.setFullYear(today.getFullYear() - 1);
  const oneYearAgoEnd = new Date(oneYearAgoStart);
  oneYearAgoEnd.setDate(oneYearAgoEnd.getDate() + 1);

  const [bookings, importedTrips] = await Promise.all([
    prisma.booking.findMany({
      where: {
        travelDate: { gte: oneYearAgoStart, lt: oneYearAgoEnd },
        status: { in: ["COMPLETED", "CONFIRMED"] },
      },
      select: { userId: true, productTitle: true, bookingRef: true },
    }),
    prisma.importedTrip.findMany({
      where: { travelDate: { gte: oneYearAgoStart, lt: oneYearAgoEnd } },
      select: { userId: true, productTitle: true },
    }),
  ]);

  // Dedupe by user
  const usersHit = new Map<number, { productTitle: string }>();
  for (const b of bookings) usersHit.set(b.userId, { productTitle: b.productTitle });
  for (const i of importedTrips) {
    if (!usersHit.has(i.userId)) usersHit.set(i.userId, { productTitle: i.productTitle });
  }

  let queued = 0;
  for (const [userId, info] of usersHit.entries()) {
    const recent = await prisma.emailDelivery.findFirst({
      where: {
        userId,
        type: "TRIP_ANNIVERSARY",
        createdAt: { gte: new Date(Date.now() - 60 * 24 * 3600 * 1000) },
      },
    });
    if (recent) continue;

    await prisma.emailDelivery.create({
      data: {
        userId,
        type: "TRIP_ANNIVERSARY",
        meta: { productTitle: info.productTitle, anniversaryYear: 1 },
      },
    });
    queued++;
  }

  return NextResponse.json({
    ok: true,
    candidates: usersHit.size,
    queued,
    note: "Stub created EmailDelivery rows; ESP send TODO.",
  });
}
