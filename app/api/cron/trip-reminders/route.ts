import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTripReminder } from "@/lib/email";

/**
 * Daily Cron Job: send T-1 reminder emails for upcoming trips.
 * Authorized by CRON_SECRET header.
 *
 * Targets bookings where:
 *  - status is CONFIRMED or COMPLETED (ticket ready)
 *  - travelDate is tomorrow (UTC day boundary)
 *  - reminderSentAt is null (not previously sent)
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const secret = process.env.CRON_SECRET || "default_secret";

  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startOfTomorrow = new Date();
  startOfTomorrow.setHours(0, 0, 0, 0);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const startOfDayAfter = new Date(startOfTomorrow);
  startOfDayAfter.setDate(startOfDayAfter.getDate() + 1);

  const targets = await prisma.booking.findMany({
    where: {
      status: { in: ["CONFIRMED", "COMPLETED"] },
      travelDate: { gte: startOfTomorrow, lt: startOfDayAfter },
      reminderSentAt: null,
    },
    include: { user: { select: { email: true, name: true } } },
  });

  let sent = 0;
  const errors: { id: number; error: string }[] = [];

  for (const b of targets) {
    if (!b.user?.email) continue;
    try {
      await sendTripReminder({
        email: b.user.email,
        userName: b.user.name || "",
        bookingRef: b.bookingRef,
        productTitle: b.productTitle,
        travelDate: b.travelDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        travelTime: b.travelTime,
        meetingPoint: b.meetingPoint,
        pax: b.pax,
        ticketToken: b.ticketToken,
      });
      await prisma.booking.update({
        where: { id: b.id },
        data: { reminderSentAt: new Date() },
      });
      sent++;
    } catch (e) {
      errors.push({ id: b.id, error: e instanceof Error ? e.message : "Unknown" });
      console.error(`[trip-reminders] failed for booking ${b.id}:`, e);
    }
  }

  return NextResponse.json({ sent, candidates: targets.length, errors });
}
