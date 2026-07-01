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
 * Natural-Language Search parser (Proposal A).
 *
 * Turns a free-text query ("waterfall day trip for kids near Ubud under 500k")
 * into a structured filter object. Retrieval stays deterministic on the client
 * (DB + Viator); this endpoint only does intent → filters. 1 credit/query.
 */

const MODEL = "llama-3.3-70b-versatile";

const REGIONS = [
  "Ubud", "Canggu", "Seminyak", "Kuta", "Sanur", "Nusa Dua",
  "Uluwatu", "Lovina", "Amed", "Nusa Penida",
];
const THEMES = [
  "adventure", "culture", "food", "wellness", "family", "luxury",
  "budget", "nature", "beach", "diving", "surf", "nightlife",
];

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let reservationId: number | null = null;
  const ENDPOINT = "search" as const;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const body = await req.json().catch(() => ({}));
    const query = typeof body?.query === "string" ? body.query.trim().slice(0, 300) : "";
    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    await ensureFreeMonthlyGrant(userId).catch(() => {});
    const reserved = await reserveCredits(userId, ENDPOINT, AI_ENDPOINT_COST.search);
    if (!reserved.ok) {
      return NextResponse.json(
        { error: "Out of AI credits", reason: reserved.reason, balance: reserved.remainingBalance, upgradeUrl: "/ai/pricing" },
        { status: 402 }
      );
    }
    reservationId = reserved.reservationId ?? null;

    const systemPrompt = `You convert a traveler's free-text Bali search into structured filters.

Output ONLY valid JSON (no markdown):
{
  "keywords": string,            // cleaned search terms for full-text matching (no region/budget words)
  "region": string | null,       // one of: ${REGIONS.join(", ")} — or null
  "themes": string[],            // subset of: ${THEMES.join(", ")}
  "budgetMaxIdr": number | null, // parse "500k"=500000, "1jt"/"1 juta"=1000000, "$50"≈800000
  "kidFriendly": boolean,
  "indoor": boolean | null,      // true if they want indoor/rainy-day, false if explicitly outdoor, else null
  "summary": string              // one short sentence describing what they're looking for
}

RULES:
- Never invent a region not in the list. Match loosely ("near ubud" -> "Ubud").
- keywords must stay useful for search (e.g. "waterfall", "cooking class", "snorkeling").
- Keep summary under 15 words.`;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 400,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      if (reservationId !== null) await cancelReservation(reservationId).catch(() => {});
      return NextResponse.json({ error: "Could not understand that search; try rephrasing." }, { status: 502 });
    }

    // Sanitize into a strict shape.
    const region = typeof parsed.region === "string" && REGIONS.includes(parsed.region) ? parsed.region : null;
    const themes = Array.isArray(parsed.themes)
      ? parsed.themes.filter((t): t is string => typeof t === "string" && THEMES.includes(t)).slice(0, 6)
      : [];
    const filters = {
      keywords: typeof parsed.keywords === "string" ? parsed.keywords.slice(0, 120) : query,
      region,
      themes,
      budgetMaxIdr:
        typeof parsed.budgetMaxIdr === "number" && parsed.budgetMaxIdr > 0
          ? Math.round(parsed.budgetMaxIdr)
          : null,
      kidFriendly: parsed.kidFriendly === true,
      indoor: typeof parsed.indoor === "boolean" ? parsed.indoor : null,
      summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 160) : "",
    };

    const tokensIn = completion.usage?.prompt_tokens ?? null;
    const tokensOut = completion.usage?.completion_tokens ?? null;
    const durationMs = Date.now() - startedAt;
    const actualCost = Math.max(AI_ENDPOINT_COST.search, settledChatCost(tokensIn ?? 0, tokensOut ?? 0));
    if (reservationId !== null) {
      await settleReservation(reservationId, actualCost, { tokensIn, tokensOut, durationMs }).catch(() => {});
    }
    await prisma.aiUsage
      .create({
        data: { userId, endpoint: ENDPOINT, creditsCost: actualCost, tokensIn, tokensOut, durationMs, model: MODEL, status: "OK" },
      })
      .catch(() => {});

    return NextResponse.json({ filters });
  } catch (error) {
    if (reservationId !== null) await cancelReservation(reservationId).catch(() => {});
    console.error("[ai/search-parse]", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json({ error: "Search assistant unavailable" }, { status: 500 });
  }
}
