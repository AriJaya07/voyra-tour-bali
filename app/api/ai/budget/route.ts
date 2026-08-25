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
 * Itinerary Budget Optimizer (Feature 4 / planner improvement).
 *
 * Gives a saved itinerary a real COST picture and, when a target is set, uses
 * AI to reason about which items to swap or drop to fit — the pricing math is
 * deterministic; the AI only drives the trade-off strategy. It does NOT mutate
 * the saved itinerary (the user applies changes via the existing Refine panel).
 *
 * Activity prices in itineraries are Viator "from" prices in USD; we present
 * USD and an approximate IDR estimate (labelled), never a fabricated number.
 */

import { GROQ_MODEL as MODEL } from "@/lib/config/aiModel";
// Mirrors the documented fallback in utils/formatPrice.ts (last update 2026-05).
const USD_TO_IDR = 16450;

interface PlanItem {
  day: number;
  slot: string;
  title: string;
  source: string;
  price?: number | null;
}

interface Suggestion {
  day: number;
  itemTitle: string;
  action: "swap" | "remove";
  reason: string;
  estSavingUsd: number;
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let reservationId: number | null = null;
  const ENDPOINT = "budget" as const;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const body = await req.json().catch(() => ({}));
    const itineraryId = Number.isFinite(Number(body?.itineraryId)) ? Number(body.itineraryId) : null;
    const targetIdr =
      Number.isFinite(Number(body?.targetIdr)) && Number(body.targetIdr) > 0 ? Number(body.targetIdr) : null;
    if (!itineraryId) {
      return NextResponse.json({ error: "itineraryId is required" }, { status: 400 });
    }

    const itinerary = await prisma.savedItinerary.findFirst({
      where: { id: itineraryId, userId },
      select: { title: true, itemsJson: true },
    });
    if (!itinerary) {
      return NextResponse.json({ error: "Itinerary not found" }, { status: 404 });
    }

    const items: PlanItem[] = Array.isArray(itinerary.itemsJson)
      ? (itinerary.itemsJson as unknown as PlanItem[]).filter(
          (i) => i && typeof i === "object" && typeof i.title === "string"
        )
      : [];

    // Deterministic cost picture (USD native → approx IDR).
    const perDayMap = new Map<number, number>();
    let totalUsd = 0;
    for (const it of items) {
      const price = typeof it.price === "number" && it.price > 0 ? it.price : 0;
      totalUsd += price;
      perDayMap.set(it.day, (perDayMap.get(it.day) ?? 0) + price);
    }
    const perDay = Array.from(perDayMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([day, usd]) => ({ day, usd: round2(usd), idrApprox: Math.round(usd * USD_TO_IDR) }));

    const estimatedTotalIdr = Math.round(totalUsd * USD_TO_IDR);
    const targetUsd = targetIdr ? targetIdr / USD_TO_IDR : null;
    const overBudget = targetUsd != null && totalUsd > targetUsd;

    await ensureFreeMonthlyGrant(userId).catch(() => {});
    const reserved = await reserveCredits(userId, ENDPOINT, AI_ENDPOINT_COST.budget);
    if (!reserved.ok) {
      return NextResponse.json(
        { error: "Out of AI credits", reason: reserved.reason, balance: reserved.remainingBalance, upgradeUrl: "/ai/pricing" },
        { status: 402 }
      );
    }
    reservationId = reserved.reservationId ?? null;

    // Ask the AI for trade-off strategy (structured JSON). Grounded in real items.
    const priced = items
      .map((i) => `Day ${i.day} ${i.slot}: ${i.title} — ${i.price ? `$${i.price}` : "free/tip"} (${i.source})`)
      .join("\n");

    const systemPrompt = `You are a Bali trip budget advisor. Given an itinerary with per-activity USD prices, recommend how to fit a target budget.
${targetUsd != null ? `TARGET: about $${round2(targetUsd)} USD (user entered Rp ${targetIdr?.toLocaleString()} ).` : "No target given — just give money-saving advice."}
CURRENT ESTIMATED ACTIVITY TOTAL: $${round2(totalUsd)} USD.

ITINERARY
${priced}

Return ONLY JSON:
{
  "advice": "2-3 sentence plain summary",
  "suggestions": [ { "day": number, "itemTitle": string, "action": "swap" | "remove", "reason": string, "estSavingUsd": number } ]
}
RULES
- Only reference items that exist above. Keep the trip's character — don't gut it.
- Prefer swapping pricey activities for cheaper equivalents over removing everything.
- If already under target, return an empty suggestions array and congratulate briefly.
- estSavingUsd must be a realistic number based on the listed prices.`;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: targetIdr ? `Fit my trip to Rp ${targetIdr.toLocaleString()}.` : "How can I save money on this trip?" },
      ],
    });

    let advice = "";
    let suggestions: Suggestion[] = [];
    try {
      const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
      advice = typeof parsed.advice === "string" ? parsed.advice : "";
      if (Array.isArray(parsed.suggestions)) {
        const titles = new Set(items.map((i) => i.title));
        suggestions = parsed.suggestions
          .filter(
            (s: unknown): s is Suggestion =>
              typeof s === "object" && s !== null && typeof (s as Suggestion).itemTitle === "string"
          )
          .filter((s: Suggestion) => titles.has(s.itemTitle)) // never invent items
          .slice(0, 10);
      }
    } catch {
      advice = "Couldn't parse budget suggestions — try again.";
    }

    const tokensIn = completion.usage?.prompt_tokens ?? null;
    const tokensOut = completion.usage?.completion_tokens ?? null;
    const durationMs = Date.now() - startedAt;
    const actualCost = Math.max(AI_ENDPOINT_COST.budget, settledChatCost(tokensIn ?? 0, tokensOut ?? 0));
    if (reservationId !== null) {
      await settleReservation(reservationId, actualCost, { tokensIn, tokensOut, durationMs }).catch(() => {});
    }
    await prisma.aiUsage
      .create({
        data: { userId, endpoint: ENDPOINT, creditsCost: actualCost, tokensIn, tokensOut, durationMs, model: MODEL, status: "OK" },
      })
      .catch(() => {});

    return NextResponse.json({
      title: itinerary.title,
      estimatedTotalUsd: round2(totalUsd),
      estimatedTotalIdr,
      perDay,
      targetIdr,
      overBudget,
      advice,
      suggestions,
      rateNote: `IDR figures are approximate (≈ Rp ${USD_TO_IDR.toLocaleString()}/USD) and exclude meals, transport, and accommodation.`,
    });
  } catch (error) {
    if (reservationId !== null) await cancelReservation(reservationId).catch(() => {});
    console.error("[ai/budget]", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json({ error: "Budget optimizer unavailable" }, { status: 500 });
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
