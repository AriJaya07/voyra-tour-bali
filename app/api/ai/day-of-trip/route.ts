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
 * Day-of-Trip Assistant — "It's raining in Ubud, what can I do indoors?"
 *
 * Pricing model:
 *  - Free for users with a CONFIRMED Booking whose travelDate ∈ [today−1, today+14d]
 *    (loss leader → drives review submission + repeat visits).
 *  - Otherwise credit-gated, 3 credits/turn.
 */

const MODEL = "llama-3.3-70b-versatile";

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let reservationId: number | null = null;
  let billedUserId: number | null = null;
  let chargedZero = false;
  const ENDPOINT = "day_of_trip" as const;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const body = await req.json().catch(() => ({}));
    const userMessage = typeof body?.userMessage === "string" ? body.userMessage.trim() : "";
    const region = typeof body?.region === "string" ? body.region : null;
    const weather = typeof body?.weather === "string" ? body.weather : null;
    if (!userMessage) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Detect "in trip window" — free unlock for confirmed travelers
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today.getTime() - 86_400_000);
    const fortnight = new Date(today.getTime() + 14 * 86_400_000);

    const activeBooking = await prisma.booking.findFirst({
      where: {
        userId,
        status: "CONFIRMED",
        travelDate: { gte: yesterday, lte: fortnight },
      },
      orderBy: { travelDate: "asc" },
      select: { id: true, productTitle: true, travelDate: true, meetingPoint: true },
    });

    await ensureFreeMonthlyGrant(userId).catch(() => {});

    // In-trip-window users get this free; others spend credits.
    if (activeBooking) {
      chargedZero = true;
    } else {
      const reserved = await reserveCredits(userId, ENDPOINT, AI_ENDPOINT_COST.day_of_trip);
      if (!reserved.ok) {
        return NextResponse.json(
          { error: "Out of AI credits", reason: reserved.reason, balance: reserved.remainingBalance, upgradeUrl: "/plans" },
          { status: 402 }
        );
      }
      reservationId = reserved.reservationId ?? null;
      billedUserId = userId;
    }

    const bookingLine = activeBooking
      ? `User has a CONFIRMED tour: "${activeBooking.productTitle}" on ${activeBooking.travelDate.toISOString().slice(0, 10)}${activeBooking.meetingPoint ? ` (meet at ${activeBooking.meetingPoint})` : ""}.`
      : "User has no active booking — answer generally.";

    const contextLines: string[] = [bookingLine];
    if (region) contextLines.push(`User location: ${region}.`);
    if (weather) contextLines.push(`Current weather: ${weather}.`);

    const systemPrompt = `You are Voyra's Day-of-Trip helper. The user is currently on or near a trip to Bali.

CONTEXT
${contextLines.join("\n")}

GOALS
- Answer practical, immediate questions: alternative activities, weather pivots, transport, where to eat near my hotel right now.
- Prefer suggestions within ~30 minutes of the user's stated location.
- For weather pivots: rain ≠ stay home — temple courtyards, Ubud cafes, spa, museums, gallery, cooking class are all good.
- Respect island travel times: Ubud↔Uluwatu = 2-3h; Nusa Penida is a full day.
- Never invent prices. If asked, say "ask the venue or check Google Maps."
- 120 words max unless explicitly told otherwise.`;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 400,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const reply = completion.choices[0]?.message?.content ?? "";
    const tokensIn = completion.usage?.prompt_tokens ?? null;
    const tokensOut = completion.usage?.completion_tokens ?? null;
    const durationMs = Date.now() - startedAt;

    if (chargedZero) {
      await prisma.aiUsage
        .create({
          data: {
            userId,
            endpoint: ENDPOINT,
            creditsCost: 0,
            tokensIn,
            tokensOut,
            durationMs,
            model: MODEL,
            status: "OK",
            meta: { freeForTraveler: true, bookingId: activeBooking!.id },
          },
        })
        .catch(() => {});
    } else {
      const actualCost = Math.max(
        AI_ENDPOINT_COST.day_of_trip,
        settledChatCost(tokensIn ?? 0, tokensOut ?? 0)
      );
      if (reservationId !== null) {
        await settleReservation(reservationId, actualCost, { tokensIn, tokensOut, durationMs }).catch(() => {});
      }
      if (billedUserId !== null) {
        await prisma.aiUsage
          .create({
            data: {
              userId: billedUserId,
              endpoint: ENDPOINT,
              creditsCost: actualCost,
              tokensIn,
              tokensOut,
              durationMs,
              model: MODEL,
              status: "OK",
            },
          })
          .catch(() => {});
      }
    }

    return NextResponse.json({
      reply,
      free: chargedZero,
      booking: activeBooking
        ? {
            id: activeBooking.id,
            productTitle: activeBooking.productTitle,
            travelDate: activeBooking.travelDate,
          }
        : null,
    });
  } catch (error) {
    if (reservationId !== null) await cancelReservation(reservationId).catch(() => {});
    console.error("[ai/day-of-trip]", error);
    return NextResponse.json({ error: "Day-of-trip assistant unavailable" }, { status: 500 });
  }
}
