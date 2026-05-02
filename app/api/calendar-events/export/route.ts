import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

const PRODID = "-//Voyra Bali//Trip Calendar//EN";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toIcsDate(d: Date) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

function toIcsDateTime(d: Date) {
  return `${toIcsDate(d)}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function toIcsDateTimeLocal(date: Date, time: string) {
  // time: "HH:MM"
  const [h, m] = time.split(":").map((s) => parseInt(s));
  const local = new Date(date);
  local.setHours(h, m, 0, 0);
  return `${local.getFullYear()}${pad(local.getMonth() + 1)}${pad(local.getDate())}T${pad(
    local.getHours()
  )}${pad(local.getMinutes())}00`;
}

function escapeIcs(value: string | null | undefined) {
  if (!value) return "";
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function fold(line: string) {
  // RFC5545 line folding at 75 octets. Naive char-based folding suffices for ASCII content here.
  if (line.length <= 75) return line;
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    out.push((i === 0 ? "" : " ") + line.slice(i, i + 73));
    i += 73;
  }
  return out.join("\r\n");
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  const userId = parseInt(session.user.id);

  const url = new URL(req.url);
  const includeTrips = url.searchParams.get("trips") !== "0";
  const includeItineraries = url.searchParams.get("itineraries") !== "0";

  const [events, trips, itineraries] = await Promise.all([
    prisma.calendarEvent.findMany({ where: { userId }, orderBy: { date: "asc" } }),
    includeTrips
      ? prisma.importedTrip.findMany({
          where: { userId, travelDate: { not: null } },
          orderBy: { travelDate: "asc" },
        })
      : Promise.resolve([]),
    includeItineraries
      ? prisma.savedItinerary.findMany({
          where: { userId, fromDate: { not: null } },
          orderBy: { fromDate: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const stamp = toIcsDateTime(new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Voyra Bali Trip Calendar",
  ];

  for (const e of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(fold(`UID:event-${e.id}@voyra-bali`));
    lines.push(`DTSTAMP:${stamp}`);
    if (e.startTime) {
      lines.push(`DTSTART:${toIcsDateTimeLocal(e.date, e.startTime)}`);
      const end = e.endTime || e.startTime;
      const endDateTime = toIcsDateTimeLocal(e.date, end);
      lines.push(`DTEND:${endDateTime}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${toIcsDate(e.date)}`);
      const next = new Date(e.date);
      next.setUTCDate(next.getUTCDate() + 1);
      lines.push(`DTEND;VALUE=DATE:${toIcsDate(next)}`);
    }
    lines.push(fold(`SUMMARY:${escapeIcs(e.title)}`));
    if (e.location) lines.push(fold(`LOCATION:${escapeIcs(e.location)}`));
    if (e.notes) lines.push(fold(`DESCRIPTION:${escapeIcs(e.notes)}`));
    lines.push("END:VEVENT");
  }

  for (const t of trips) {
    if (!t.travelDate) continue;
    lines.push("BEGIN:VEVENT");
    lines.push(fold(`UID:trip-${t.id}@voyra-bali`));
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART;VALUE=DATE:${toIcsDate(t.travelDate)}`);
    const next = new Date(t.travelDate);
    next.setUTCDate(next.getUTCDate() + 1);
    lines.push(`DTEND;VALUE=DATE:${toIcsDate(next)}`);
    lines.push(fold(`SUMMARY:🎫 ${escapeIcs(t.productTitle)}`));
    if (t.href) lines.push(fold(`URL:${t.href}`));
    lines.push("END:VEVENT");
  }

  for (const it of itineraries) {
    if (!it.fromDate) continue;
    lines.push("BEGIN:VEVENT");
    lines.push(fold(`UID:itinerary-${it.id}@voyra-bali`));
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART;VALUE=DATE:${toIcsDate(it.fromDate)}`);
    const end = it.toDate ?? it.fromDate;
    const next = new Date(end);
    next.setUTCDate(next.getUTCDate() + 1);
    lines.push(`DTEND;VALUE=DATE:${toIcsDate(next)}`);
    lines.push(fold(`SUMMARY:📋 ${escapeIcs(it.title)}`));
    if (it.shareSlug) {
      lines.push(fold(`URL:/share/itinerary/${it.shareSlug}`));
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  const body = lines.join("\r\n") + "\r\n";
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="voyra-bali-calendar.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
