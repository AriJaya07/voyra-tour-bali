import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { buildViatorProductUrl } from "@/lib/config/viator";
import {
  cancelReservation,
  ensureFreeMonthlyGrant,
  reserveCredits,
  settleReservation,
} from "@/lib/services/aiCreditService";
import { AI_ENDPOINT_COST, settledChatCost } from "@/lib/config/aiCosts";
import {
  searchViatorProducts,
  type ViatorProductImage,
  type ViatorProductSummary,
} from "@/lib/services/viatorSearch";

/**
 * Plan Refine — modify a single day of an existing SavedItinerary.
 *
 * Credit-gated only (6 credits). Cheaper than full plan generation because we
 * keep the surrounding days untouched and only ask the LLM to swap items in
 * the targeted day. Reuses the candidate-pool guardrails from /api/ai/plan to
 * stop the model from hallucinating productCodes.
 *
 * Body: { itineraryId, day: 1..N, instruction: "less driving" | "more food" | ... }
 */

import { GROQ_MODEL as MODEL } from "@/lib/config/aiModel";

type ViatorImage = ViatorProductImage;
type ViatorProduct = ViatorProductSummary;

interface PlanItem {
  day: number;
  slot: "morning" | "afternoon" | "evening";
  productCode: string | null;
  title: string;
  source: "viator" | "tip" | "free";
  notes?: string;
  href?: string | null;
  imageUrl?: string;
  price?: number | null;
  rating?: number | null;
  durationMinutes?: number | null;
}

const VALID_SLOTS = new Set(["morning", "afternoon", "evening"]);

function getBestImageUrl(images: ViatorImage[]): string {
  const cover = images.find((img) => img.isCover) ?? images[0];
  if (!cover?.variants?.length) return "";
  const sorted = [...cover.variants].sort(
    (a, b) => Math.abs(a.width - 720) - Math.abs(b.width - 720)
  );
  return sorted[0]?.url ?? "";
}

async function viatorSearch(query: string, count: number): Promise<ViatorProduct[]> {
  const result = await searchViatorProducts({ query, count, currency: "USD" });
  return result.products;
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let reservationId: number | null = null;
  let billedUserId: number | null = null;
  const ENDPOINT = "plan_refine" as const;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const body = await req.json().catch(() => ({}));
    const itineraryId = Number(body?.itineraryId);
    const day = Number(body?.day);
    const instruction = typeof body?.instruction === "string" ? body.instruction.trim() : "";
    if (!Number.isFinite(itineraryId) || itineraryId <= 0) {
      return NextResponse.json({ error: "Invalid itineraryId" }, { status: 400 });
    }
    if (!Number.isFinite(day) || day <= 0) {
      return NextResponse.json({ error: "Invalid day" }, { status: 400 });
    }
    if (!instruction) {
      return NextResponse.json({ error: "instruction is required" }, { status: 400 });
    }

    const itin = await prisma.savedItinerary.findFirst({
      where: { id: itineraryId, userId },
    });
    if (!itin) {
      return NextResponse.json({ error: "Itinerary not found" }, { status: 404 });
    }

    const items = Array.isArray(itin.itemsJson) ? (itin.itemsJson as unknown as PlanItem[]) : [];
    if (items.length === 0) {
      return NextResponse.json({ error: "Itinerary has no items" }, { status: 400 });
    }

    const targetDay = items.filter((it) => it.day === day);
    const otherDays = items.filter((it) => it.day !== day);
    if (targetDay.length === 0) {
      return NextResponse.json({ error: `Day ${day} not found in itinerary` }, { status: 400 });
    }

    await ensureFreeMonthlyGrant(userId).catch(() => {});

    const reserved = await reserveCredits(userId, ENDPOINT, AI_ENDPOINT_COST.plan_refine);
    if (!reserved.ok) {
      return NextResponse.json(
        { error: "Out of AI credits", reason: reserved.reason, balance: reserved.remainingBalance, upgradeUrl: "/ai/pricing" },
        { status: 402 }
      );
    }
    reservationId = reserved.reservationId ?? null;
    billedUserId = userId;

    // Re-search Viator candidates around the user's instruction
    const candidates = await viatorSearch(instruction, 16);
    const codeMap = new Map<string, ViatorProduct>();
    for (const c of candidates) if (c.productCode) codeMap.set(c.productCode, c);
    const candidateLines = candidates
      .map(
        (p) =>
          `- code:${p.productCode} | title:${p.title} | priceUSD:${p.pricing?.summary?.fromPrice ?? "?"} | rating:${p.reviews?.combinedAverageRating ?? "?"} | durMin:${p.duration?.fixedDurationInMinutes ?? "?"}`
      )
      .join("\n");

    // Existing day items as JSON the LLM can edit
    const existingForLLM = targetDay.map((it) => ({
      slot: it.slot,
      productCode: it.productCode,
      title: it.title,
      source: it.source,
      notes: it.notes ?? "",
    }));

    const systemPrompt = `You are an expert Bali trip planner refining a single day of an existing itinerary.

USER INSTRUCTION: "${instruction}"

Output ONLY valid JSON matching this shape (no markdown, no commentary):
{
  "day": ${day},
  "items": [
    {
      "slot": "morning" | "afternoon" | "evening",
      "productCode": string | null,
      "title": string,
      "source": "viator" | "tip" | "free",
      "notes": string
    }
  ]
}

HARD RULES:
1. Output 1-3 items for day ${day} only — do NOT touch other days.
2. NEVER invent productCode. If you set source="viator", productCode MUST appear in the CANDIDATE POOL below.
3. If productCode is set, copy candidate title verbatim.
4. Do NOT emit href, imageUrl, price, rating, duration — server enriches.
5. Respect the user's instruction (e.g. "less driving" = pick items in same region; "more food" = swap to cooking class / restaurant tip).
6. Mornings = activity, afternoons = culture / food / wellness, evenings = sunset / dinner / relax.

EXISTING DAY ITEMS (you may keep, modify, or remove any):
${JSON.stringify(existingForLLM, null, 2)}

CANDIDATE POOL (${candidates.length} items):
${candidateLines || "(empty — use only tips with productCode=null)"}

Respond with the JSON object only.`;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 1500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Refine day ${day} per the instruction. Return JSON only.`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { day?: number; items?: Array<{ slot?: string; productCode?: string | null; title?: string; source?: string; notes?: string }> };
    try {
      parsed = JSON.parse(raw);
    } catch {
      if (reservationId !== null) await cancelReservation(reservationId).catch(() => {});
      return NextResponse.json({ error: "Refine generation failed; try again" }, { status: 502 });
    }

    // Enrich + validate, exactly like /api/ai/plan
    const refinedDay: PlanItem[] = (parsed.items ?? [])
      .filter(
        (it): it is { slot: string; productCode: string | null; title: string; source: string; notes?: string } =>
          !!it &&
          typeof it.slot === "string" &&
          VALID_SLOTS.has(it.slot) &&
          typeof it.title === "string"
      )
      .slice(0, 3)
      .map((it) => {
        const codeRaw = typeof it.productCode === "string" ? it.productCode.trim() : "";
        const cand = codeRaw ? codeMap.get(codeRaw) : undefined;
        if (cand && cand.productCode && cand.title) {
          return {
            day,
            slot: it.slot as PlanItem["slot"],
            productCode: cand.productCode,
            title: cand.title,
            notes: typeof it.notes === "string" ? it.notes : "",
            source: "viator" as const,
            href: buildViatorProductUrl(cand.productCode, cand.title),
            imageUrl: getBestImageUrl(cand.images ?? []),
            price: cand.pricing?.summary?.fromPrice ?? null,
            rating: cand.reviews?.combinedAverageRating ?? null,
            durationMinutes: cand.duration?.fixedDurationInMinutes ?? null,
          };
        }
        return {
          day,
          slot: it.slot as PlanItem["slot"],
          productCode: null,
          title: it.title,
          notes: typeof it.notes === "string" ? it.notes : "",
          source: it.source === "free" ? "free" : ("tip" as const),
          href: null,
          price: null,
          rating: null,
          durationMinutes: null,
        };
      });

    // Merge: keep other days, replace targeted day
    const mergedItems = [...otherDays, ...refinedDay].sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day;
      const order: Record<string, number> = { morning: 0, afternoon: 1, evening: 2 };
      return (order[a.slot] ?? 9) - (order[b.slot] ?? 9);
    });

    await prisma.savedItinerary.update({
      where: { id: itin.id },
      data: { itemsJson: mergedItems as unknown as Prisma.InputJsonValue },
    });

    // Settle credits with token-aware actual cost
    const tokensIn = completion.usage?.prompt_tokens ?? null;
    const tokensOut = completion.usage?.completion_tokens ?? null;
    const durationMs = Date.now() - startedAt;
    const actualCost = Math.max(
      AI_ENDPOINT_COST.plan_refine,
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
            meta: { itineraryId, day, instruction: instruction.slice(0, 100) },
          },
        })
        .catch(() => {});
    }

    return NextResponse.json({
      itineraryId: itin.id,
      day,
      refinedDay,
      items: mergedItems,
    });
  } catch (error) {
    if (reservationId !== null) await cancelReservation(reservationId).catch(() => {});
    console.error("[ai/plan-refine]", error);
    return NextResponse.json({ error: "Plan refine failed" }, { status: 500 });
  }
}
