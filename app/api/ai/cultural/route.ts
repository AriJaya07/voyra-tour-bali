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
 * Cultural Co-Pilot — answers questions about Bali ceremonies + cultural calendar.
 * Pulls relevant BaliEvent rows around the user's mentioned date / current date
 * to ground the LLM. 2 credits/turn. Credit-gated only — any user with balance.
 */

const MODEL = "llama-3.3-70b-versatile";

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let reservationId: number | null = null;
  let billedUserId: number | null = null;
  const ENDPOINT = "cultural" as const;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const body = await req.json().catch(() => ({}));
    const userMessage = typeof body?.userMessage === "string" ? body.userMessage.trim() : "";
    if (!userMessage) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const focusDate = parseDate(body?.date) ?? new Date();
    const windowStart = new Date(focusDate.getTime() - 7 * 86_400_000);
    const windowEnd = new Date(focusDate.getTime() + 30 * 86_400_000);

    await ensureFreeMonthlyGrant(userId).catch(() => {});

    const reserved = await reserveCredits(userId, ENDPOINT, AI_ENDPOINT_COST.cultural);
    if (!reserved.ok) {
      return NextResponse.json(
        { error: "Out of AI credits", reason: reserved.reason, balance: reserved.remainingBalance, upgradeUrl: "/ai/pricing" },
        { status: 402 }
      );
    }
    reservationId = reserved.reservationId ?? null;
    billedUserId = userId;

    const events = await prisma.baliEvent.findMany({
      where: {
        OR: [
          { date: { gte: windowStart, lte: windowEnd } },
          { endDate: { gte: windowStart, lte: windowEnd } },
        ],
      },
      orderBy: { date: "asc" },
      take: 30,
    });

    const eventLines = events
      .map((e) => {
        const dateStr = e.date.toISOString().slice(0, 10);
        const endStr = e.endDate ? ` → ${e.endDate.toISOString().slice(0, 10)}` : "";
        const region = e.region ? ` [${e.region}]` : "";
        const impact = e.impact ? ` Impact: ${e.impact}.` : "";
        return `- ${dateStr}${endStr}${region} ${e.name} (${e.type}). ${e.description}${impact}`;
      })
      .join("\n");

    const systemPrompt = `You are Voyra's Cultural Co-Pilot — an expert on Balinese ceremonies, Hindu calendar, and travel etiquette.

GROUND TRUTH — events near the focus date (${focusDate.toISOString().slice(0, 10)}):
${eventLines || "(no events recorded in DB for this window)"}

GUIDELINES
- Answer with grounded facts from the events above when relevant.
- Always flag travel impact: Nyepi = full island shutdown (airport closed, no movement); Galungan + Kuningan = busy temples + traffic; ceremony days = expect closures.
- Recommend respectful behaviour: sarong + sash at temples, no flash photography during prayer, never step over offerings.
- For festival viewing tips, prefer dawn/dusk slots and emphasise local guide value.
- If user asks something the events don't cover, answer from general Balinese-Hindu knowledge but mark it clearly.
- 150 words max unless the user asks for more.`;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 500,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const reply = completion.choices[0]?.message?.content ?? "";
    const tokensIn = completion.usage?.prompt_tokens ?? null;
    const tokensOut = completion.usage?.completion_tokens ?? null;
    const durationMs = Date.now() - startedAt;
    const actualCost = Math.max(
      AI_ENDPOINT_COST.cultural,
      settledChatCost(tokensIn ?? 0, tokensOut ?? 0)
    );

    if (reservationId !== null) {
      await settleReservation(reservationId, actualCost, { tokensIn, tokensOut, durationMs }).catch(() => {});
    }
    if (billedUserId !== null) {
      await prisma.aiUsage.create({
        data: {
          userId: billedUserId,
          endpoint: ENDPOINT,
          creditsCost: actualCost,
          tokensIn,
          tokensOut,
          durationMs,
          model: MODEL,
          status: "OK",
          meta: { eventsFound: events.length, focusDate: focusDate.toISOString() },
        },
      }).catch(() => {});
    }

    return NextResponse.json({
      reply,
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
    console.error("[ai/cultural]", error);
    return NextResponse.json({ error: "Cultural assistant unavailable" }, { status: 500 });
  }
}
