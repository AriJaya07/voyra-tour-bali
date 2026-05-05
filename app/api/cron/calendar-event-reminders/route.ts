import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/services/pushService";
import { parseRRule, nextOccurrenceAfter } from "@/lib/calendar/recurrence";

/**
 * Daily cron: send push reminders for events happening tomorrow.
 *
 * Non-recurring: send if reminderSent=false and date is tomorrow.
 * Recurring: compute next occurrence; if next occurrence is tomorrow, send.
 *   We do NOT mark reminderSent for recurring (would block all future reminders);
 *   instead we deduplicate by checking if the next occurrence already happened today.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const secret = process.env.CRON_SECRET || "default_secret";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const startOfTomorrow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );
  const startOfDayAfter = new Date(startOfTomorrow);
  startOfDayAfter.setUTCDate(startOfDayAfter.getUTCDate() + 1);

  const oneOff = await prisma.calendarEvent.findMany({
    where: {
      reminderSent: false,
      recurrence: null,
      date: { gte: startOfTomorrow, lt: startOfDayAfter },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          notificationPref: { select: { calendarReminders: true } },
        },
      },
    },
  });

  const recurring = await prisma.calendarEvent.findMany({
    where: {
      recurrence: { not: null },
      date: { lte: startOfDayAfter },
      OR: [{ recurrenceUntil: null }, { recurrenceUntil: { gte: startOfTomorrow } }],
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          notificationPref: { select: { calendarReminders: true } },
        },
      },
    },
  });

  const isOptedIn = (pref: { calendarReminders: boolean } | null | undefined) =>
    !pref || pref.calendarReminders !== false;

  let sent = 0;
  const errors: { id: number; error: string }[] = [];
  const tomorrowKey = `${startOfTomorrow.getUTCFullYear()}-${String(
    startOfTomorrow.getUTCMonth() + 1
  ).padStart(2, "0")}-${String(startOfTomorrow.getUTCDate()).padStart(2, "0")}`;

  let skipped = 0;
  for (const e of oneOff) {
    try {
      if (!isOptedIn(e.user?.notificationPref)) {
        skipped++;
        continue;
      }
      await sendPushToUser(e.userId, {
        title: "📅 Tomorrow on your calendar",
        body: `${e.title}${e.startTime ? ` at ${e.startTime}` : ""}${
          e.location ? ` · ${e.location}` : ""
        }`,
        url: "/trips/calendar",
        tag: `calendar-event-${e.id}`,
      });
      await prisma.calendarEvent.update({
        where: { id: e.id },
        data: { reminderSent: true },
      });
      sent++;
    } catch (err) {
      errors.push({ id: e.id, error: err instanceof Error ? err.message : "Unknown" });
    }
  }

  for (const e of recurring) {
    try {
      if (!isOptedIn(e.user?.notificationPref)) {
        skipped++;
        continue;
      }
      const rule = parseRRule(e.recurrence);
      if (!rule) continue;
      if (e.recurrenceUntil) rule.until = e.recurrenceUntil;
      const next = nextOccurrenceAfter(e.date, rule, startOfTomorrow);
      if (next !== tomorrowKey) continue;
      await sendPushToUser(e.userId, {
        title: "📅 Tomorrow on your calendar",
        body: `${e.title}${e.startTime ? ` at ${e.startTime}` : ""}${
          e.location ? ` · ${e.location}` : ""
        }`,
        url: "/trips/calendar",
        tag: `calendar-event-${e.id}-${tomorrowKey}`,
      });
      sent++;
    } catch (err) {
      errors.push({ id: e.id, error: err instanceof Error ? err.message : "Unknown" });
    }
  }

  return NextResponse.json({
    sent,
    skipped,
    candidates: oneOff.length + recurring.length,
    errors,
  });
}
