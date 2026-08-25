import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import {
  cancelReservation,
  ensureFreeMonthlyGrant,
  reserveCredits,
  settleReservation,
} from "@/lib/services/aiCreditService";
import { AI_ENDPOINT_COST, settledChatCost } from "@/lib/config/aiCosts";

/**
 * Pre-Trip Briefing (Proposal C) — synthesizes a traveler's upcoming confirmed
 * booking(s) + overlapping BaliEvent rows into a readable briefing + a prioritized
 * prep checklist. Grounded in real data (flags Nyepi/ceremony closures). 3 credits.
 */

import { GROQ_MODEL as MODEL } from "@/lib/config/aiModel";

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let reservationId: number | null = null;
  const ENDPOINT = "trip_briefing" as const;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const body = await req.json().catch(() => ({}));
    const bookingId = Number.isFinite(Number(body?.bookingId)) ? Number(body.bookingId) : null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today.getTime() - 86_400_000);

    const booking = await prisma.booking.findFirst({
      where: {
        userId,
        status: "CONFIRMED",
        travelDate: { gte: yesterday },
        ...(bookingId ? { id: bookingId } : {}),
      },
      orderBy: { travelDate: "asc" },
      select: {
        id: true,
        productTitle: true,
        travelDate: true,
        travelTime: true,
        meetingPoint: true,
        pax: true,
      },
    });

    if (!booking) {
      // Not an error — the request succeeded, there's simply nothing to brief yet.
      // Return 200 with a flag so the UI shows a friendly empty state (no red 404).
      return NextResponse.json({ noTrip: true }, { status: 200 });
    }

    // Cultural events overlapping the travel window (±3 days around travel date).
    const winStart = new Date(booking.travelDate.getTime() - 3 * 86_400_000);
    const winEnd = new Date(booking.travelDate.getTime() + 3 * 86_400_000);
    const events = await prisma.baliEvent.findMany({
      where: {
        OR: [
          { date: { gte: winStart, lte: winEnd } },
          { endDate: { gte: winStart, lte: winEnd } },
        ],
      },
      orderBy: { date: "asc" },
      take: 12,
    });

    await ensureFreeMonthlyGrant(userId).catch(() => {});
    const reserved = await reserveCredits(userId, ENDPOINT, AI_ENDPOINT_COST.trip_briefing);
    if (!reserved.ok) {
      return NextResponse.json(
        { error: "Out of AI credits", reason: reserved.reason, balance: reserved.remainingBalance, upgradeUrl: "/ai/pricing" },
        { status: 402 }
      );
    }
    reservationId = reserved.reservationId ?? null;

    const eventLines = events
      .map((e) => {
        const d = e.date.toISOString().slice(0, 10);
        const end = e.endDate ? ` → ${e.endDate.toISOString().slice(0, 10)}` : "";
        const impact = e.impact ? ` Impact: ${e.impact}.` : "";
        return `- ${d}${end} ${e.name} (${e.type}).${impact}`;
      })
      .join("\n");

    const systemPrompt = `You are Voyra's pre-trip briefer. Prepare a traveler for their upcoming Bali tour.

BOOKING
- Tour: ${booking.productTitle}
- Date: ${booking.travelDate.toISOString().slice(0, 10)}${booking.travelTime ? ` at ${booking.travelTime}` : ""}
- Party size: ${booking.pax}
${booking.meetingPoint ? `- Meeting point: ${booking.meetingPoint}` : ""}

CULTURAL EVENTS NEAR THE TRAVEL DATE
${eventLines || "(none recorded)"}

Output ONLY valid JSON (no markdown):
{
  "briefing": string,      // 2-4 short sentences. Warm, practical. MUST flag any closures/impact (e.g. Nyepi = island shutdown) if events indicate it.
  "checklist": string[]    // 4-7 concise prep items tailored to this tour (what to bring/wear/arrange). No numbering.
}

RULES
- Ground claims in the booking + events. Never invent prices or transport details.
- If a high-impact event (Nyepi, major ceremony) overlaps, lead with it.`;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Write the briefing and checklist as JSON." },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { briefing?: string; checklist?: unknown };
    try {
      parsed = JSON.parse(raw);
    } catch {
      if (reservationId !== null) await cancelReservation(reservationId).catch(() => {});
      return NextResponse.json({ error: "Briefing generation failed; try again" }, { status: 502 });
    }

    const briefing = typeof parsed.briefing === "string" ? parsed.briefing.slice(0, 1200) : "";
    const checklist = Array.isArray(parsed.checklist)
      ? parsed.checklist.filter((c): c is string => typeof c === "string").slice(0, 8)
      : [];

    const tokensIn = completion.usage?.prompt_tokens ?? null;
    const tokensOut = completion.usage?.completion_tokens ?? null;
    const durationMs = Date.now() - startedAt;
    const actualCost = Math.max(AI_ENDPOINT_COST.trip_briefing, settledChatCost(tokensIn ?? 0, tokensOut ?? 0));
    if (reservationId !== null) {
      await settleReservation(reservationId, actualCost, { tokensIn, tokensOut, durationMs }).catch(() => {});
    }
    await prisma.aiUsage
      .create({
        data: { userId, endpoint: ENDPOINT, creditsCost: actualCost, tokensIn, tokensOut, durationMs, model: MODEL, status: "OK" },
      })
      .catch(() => {});

    return NextResponse.json({
      briefing,
      checklist,
      booking: {
        id: booking.id,
        productTitle: booking.productTitle,
        travelDate: booking.travelDate,
      },
      events: events.map((e) => ({
        slug: e.slug,
        name: e.name,
        type: e.type,
        date: e.date,
        endDate: e.endDate,
        region: e.region,
        impact: e.impact,
      })),
    });
  } catch (error) {
    if (reservationId !== null) await cancelReservation(reservationId).catch(() => {});
    console.error("[ai/trip-briefing]", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json({ error: "Briefing assistant unavailable" }, { status: 500 });
  }
}
