import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/services/notificationService";
import { sendPushToUser } from "@/lib/services/pushService";

/**
 * Trip Guardian (Feature 6) — proactive, AI-reasoned trip protection.
 *
 * Where the legacy weather/volcano crons only fire templated "heads up" alerts,
 * the Guardian joins each traveller's imminent trip with REAL weather
 * (Open-Meteo, keyless) and the Bali cultural calendar, then uses AI to write a
 * short, actionable suggestion (e.g. "rain likely on your Nusa Penida day —
 * consider swapping to an indoor Ubud plan"). Delivered in-app + push, linking
 * to /trips so the user can act.
 *
 * Runs daily. Idempotent: at most one Guardian alert per user per ~20h.
 */

import { GROQ_MODEL as MODEL } from "@/lib/config/aiModel";
// Bali island centre — Destination rows have no lat/lng, so we use one
// island-level forecast (documented approximation).
const BALI_LAT = -8.4095;
const BALI_LNG = 115.1889;

interface Forecast {
  date: string;
  precipProbMax: number | null;
  code: number | null;
}

/** Rainy/stormy WMO weather codes (drizzle, rain, showers, thunderstorm). */
function isWet(code: number | null): boolean {
  if (code == null) return false;
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 99);
}

async function getBaliForecast(fromISO: string, toISO: string): Promise<Forecast[]> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${BALI_LAT}&longitude=${BALI_LNG}` +
    `&daily=precipitation_probability_max,weathercode&timezone=Asia%2FMakassar` +
    `&start_date=${fromISO}&end_date=${toISO}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const data = await res.json();
  const days: string[] = data?.daily?.time ?? [];
  const probs: (number | null)[] = data?.daily?.precipitation_probability_max ?? [];
  const codes: (number | null)[] = data?.daily?.weathercode ?? [];
  return days.map((d, i) => ({ date: d, precipProbMax: probs[i] ?? null, code: codes[i] ?? null }));
}

function baliDayISO(d: Date): string {
  // Bali is UTC+8; format the calendar day in that zone.
  return new Date(d.getTime() + 8 * 3600000).toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const secret = process.env.CRON_SECRET || "default_secret";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const windowEnd = new Date(startOfToday.getTime() + 3 * 86400000);

  try {
    // Opt-in: trip reminders (default true). Keeps this protective, not marketing.
    const optedIn = await prisma.notificationPref.findMany({
      where: { tripReminders: true },
      select: { userId: true },
    });
    const optIds = new Set(optedIn.map((p) => p.userId));

    // Collect imminent trips (confirmed bookings + imported trips).
    const [bookings, trips] = await Promise.all([
      prisma.booking.findMany({
        where: { status: "CONFIRMED", travelDate: { gte: startOfToday, lte: windowEnd } },
        select: { userId: true, productTitle: true, travelDate: true },
      }),
      prisma.importedTrip.findMany({
        where: { travelDate: { gte: startOfToday, lte: windowEnd } },
        select: { userId: true, productTitle: true, travelDate: true },
      }),
    ]);

    // One nearest trip per user, opted-in only.
    const nearest = new Map<number, { title: string; date: Date }>();
    for (const t of [...bookings, ...trips]) {
      if (!t.travelDate || t.userId == null || !optIds.has(t.userId)) continue;
      const cur = nearest.get(t.userId);
      if (!cur || t.travelDate < cur.date) nearest.set(t.userId, { title: t.productTitle, date: t.travelDate });
    }

    if (nearest.size === 0) {
      return NextResponse.json({ ok: true, eligible: 0, alertsSent: 0 });
    }

    // One island forecast covers everyone in the window.
    let forecast: Forecast[] = [];
    try {
      forecast = await getBaliForecast(baliDayISO(startOfToday), baliDayISO(windowEnd));
    } catch (e) {
      console.error("[cron/trip-guardian] forecast", e instanceof Error ? e.message : "Unknown");
    }
    const forecastByDate = new Map(forecast.map((f) => [f.date, f]));

    // Cultural events overlapping the window.
    const events = await prisma.baliEvent.findMany({
      where: { date: { gte: startOfToday, lte: windowEnd } },
      select: { name: true, date: true, type: true, impact: true },
    });

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const twentyHoursAgo = new Date(now.getTime() - 20 * 3600000);

    let alertsSent = 0;
    const entries = Array.from(nearest.entries()).slice(0, 100); // cap per run

    for (const [userId, trip] of entries) {
      const tripDay = baliDayISO(trip.date);
      const f = forecastByDate.get(tripDay);
      const wet = f ? (f.precipProbMax != null && f.precipProbMax >= 60) || isWet(f.code) : false;

      const sameDayEvent = events.find((e) => baliDayISO(e.date) === tripDay && (e.type === "NYEPI" || !!e.impact));

      if (!wet && !sameDayEvent) continue;

      // Idempotency — skip if we already alerted this user recently.
      const recent = await prisma.appNotification.findFirst({
        where: { userId, category: "ALERT", url: "/trips", createdAt: { gte: twentyHoursAgo } },
        select: { id: true },
      });
      if (recent) continue;

      const conditions: string[] = [];
      if (wet && f?.precipProbMax != null) conditions.push(`rain likely (${f.precipProbMax}% chance)`);
      else if (wet) conditions.push("wet weather likely");
      if (sameDayEvent) {
        conditions.push(
          sameDayEvent.type === "NYEPI"
            ? "Nyepi (Day of Silence) — island-wide shutdown, airport closed"
            : `${sameDayEvent.name}${sameDayEvent.impact ? ` (${sameDayEvent.impact})` : ""}`
        );
      }

      let body = "";
      try {
        const completion = await groq.chat.completions.create({
          model: MODEL,
          max_tokens: 140,
          messages: [
            {
              role: "system",
              content:
                "You write ONE short, warm, actionable heads-up (max 2 sentences) for a Bali traveller whose upcoming activity may be affected. Be specific and suggest a concrete pivot. No greetings, no emojis overload, no fabricated facts.",
            },
            {
              role: "user",
              content: `Trip: "${trip.title}" on ${tripDay}. Concern: ${conditions.join("; ")}. Suggest what to do.`,
            },
          ],
        });
        body = completion.choices[0]?.message?.content?.trim() ?? "";
      } catch {
        body = "";
      }
      if (!body) {
        body = `Heads up for "${trip.title}" on ${tripDay}: ${conditions.join(" and ")}. Consider adjusting your plan — open your trips to review options.`;
      }

      await notifyUser({
        userId,
        title: sameDayEvent?.type === "NYEPI" ? "Nyepi affects your trip" : "Weather heads-up for your trip",
        body,
        category: "ALERT",
        url: "/trips",
        iconKey: "alert",
      }).catch(() => {});

      await sendPushToUser(userId, {
        title: "Voyra Trip Guardian",
        body: body.slice(0, 160),
        url: "/trips",
      }).catch(() => {});

      alertsSent++;
    }

    return NextResponse.json({ ok: true, eligible: nearest.size, alertsSent });
  } catch (error) {
    console.error("[cron/trip-guardian]", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json({ error: "Guardian run failed" }, { status: 500 });
  }
}
