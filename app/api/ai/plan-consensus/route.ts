import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
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
 * Group Consensus Planner (Feature 7) — reconciles multiple travellers'
 * preferences into ONE balanced itinerary, explaining the trade-offs. Saves a
 * SavedItinerary so it flows into the existing Refine / Budget / Booking-agent
 * tooling. 8 credits. Split-pay stays a non-goal; this is collaborative
 * PLANNING only.
 */

import { GROQ_MODEL as MODEL } from "@/lib/config/aiModel";

interface Member {
  label: string;
  styleTags?: string[];
  budget?: string;
  notes?: string;
}

interface PlanItem {
  day: number;
  slot: "morning" | "afternoon" | "evening";
  title: string;
  source: "tip";
  notes: string;
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let reservationId: number | null = null;
  const ENDPOINT = "consensus" as const;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const body = await req.json().catch(() => ({}));
    const days = Math.max(1, Math.min(14, Number(body?.days) || 3));
    const region = typeof body?.region === "string" ? body.region.trim().slice(0, 60) : "";
    const members: Member[] = Array.isArray(body?.members)
      ? body.members
          .filter((m: unknown): m is Member => typeof m === "object" && m !== null && typeof (m as Member).label === "string")
          .slice(0, 6)
          .map((m: Member) => ({
            label: String(m.label).slice(0, 40),
            styleTags: Array.isArray(m.styleTags) ? m.styleTags.map(String).slice(0, 8) : [],
            budget: typeof m.budget === "string" ? m.budget.slice(0, 20) : "",
            notes: typeof m.notes === "string" ? m.notes.slice(0, 200) : "",
          }))
      : [];

    if (members.length < 2) {
      return NextResponse.json({ error: "Add at least two travellers to reconcile" }, { status: 400 });
    }

    await ensureFreeMonthlyGrant(userId).catch(() => {});
    const reserved = await reserveCredits(userId, ENDPOINT, AI_ENDPOINT_COST.consensus);
    if (!reserved.ok) {
      return NextResponse.json(
        { error: "Out of AI credits", reason: reserved.reason, balance: reserved.remainingBalance, upgradeUrl: "/ai/pricing" },
        { status: 402 }
      );
    }
    reservationId = reserved.reservationId ?? null;

    const memberBrief = members
      .map(
        (m, i) =>
          `${i + 1}. ${m.label} — style: ${m.styleTags?.join(", ") || "any"}; budget: ${m.budget || "flexible"}${m.notes ? `; notes: ${m.notes}` : ""}`
      )
      .join("\n");

    const systemPrompt = `You plan a shared ${days}-day Bali trip for a GROUP with different preferences. Balance everyone fairly and explain the trade-offs.
${region ? `Base region: ${region}.` : ""}

TRAVELLERS
${memberBrief}

Return ONLY JSON:
{
  "title": string,
  "rationale": string,   // 2-4 sentences: how you balanced conflicting preferences
  "items": [ { "day": number (1..${days}), "slot": "morning" | "afternoon" | "evening", "title": string, "source": "tip", "notes": string } ]
}

RULES
- Give every day a morning, afternoon, and evening item when sensible.
- Make sure each traveller's top interest appears across the trip; note in "notes" who a given item is especially for.
- Keep it realistic for Bali geography (don't zig-zag the island in one day).
- source is always "tip" (these are suggestions the group can turn into bookings later).`;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Reconcile these ${members.length} travellers into one ${days}-day plan.` },
      ],
    });

    let title = `Group trip — ${days} days`;
    let rationale = "";
    let items: PlanItem[] = [];
    try {
      const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
      if (typeof parsed.title === "string") title = parsed.title.slice(0, 120);
      if (typeof parsed.rationale === "string") rationale = parsed.rationale;
      if (Array.isArray(parsed.items)) {
        items = parsed.items
          .filter(
            (it: unknown): it is PlanItem =>
              typeof it === "object" && it !== null && typeof (it as PlanItem).title === "string"
          )
          .map((it: PlanItem) => ({
            day: Math.max(1, Math.min(days, Number(it.day) || 1)),
            slot: ["morning", "afternoon", "evening"].includes(it.slot) ? it.slot : "morning",
            title: String(it.title).slice(0, 160),
            source: "tip" as const,
            notes: typeof it.notes === "string" ? it.notes.slice(0, 300) : "",
          }))
          .slice(0, days * 3);
      }
    } catch {
      /* fall through with empty items */
    }

    if (items.length === 0) {
      if (reservationId !== null) await cancelReservation(reservationId).catch(() => {});
      return NextResponse.json({ error: "Could not build a consensus plan — try again" }, { status: 502 });
    }

    // Save so it plugs into Refine / Budget / Booking agent.
    const saved = await prisma.savedItinerary.create({
      data: {
        userId,
        title,
        party: { members: members.map((m) => m.label) } as unknown as Prisma.InputJsonValue,
        itemsJson: items as unknown as Prisma.InputJsonValue,
        visibility: "PRIVATE",
      },
      select: { id: true },
    });

    const tokensIn = completion.usage?.prompt_tokens ?? null;
    const tokensOut = completion.usage?.completion_tokens ?? null;
    const durationMs = Date.now() - startedAt;
    const actualCost = Math.max(AI_ENDPOINT_COST.consensus, settledChatCost(tokensIn ?? 0, tokensOut ?? 0));
    if (reservationId !== null) {
      await settleReservation(reservationId, actualCost, { tokensIn, tokensOut, durationMs }).catch(() => {});
    }
    await prisma.aiUsage
      .create({
        data: { userId, endpoint: ENDPOINT, creditsCost: actualCost, tokensIn, tokensOut, durationMs, model: MODEL, status: "OK" },
      })
      .catch(() => {});

    return NextResponse.json({ itineraryId: saved.id, title, rationale, itemCount: items.length });
  } catch (error) {
    if (reservationId !== null) await cancelReservation(reservationId).catch(() => {});
    console.error("[ai/plan-consensus]", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json({ error: "Consensus planner unavailable" }, { status: 500 });
  }
}
