import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import { buildViatorProductUrl } from "@/lib/config/viator";
import {
  cancelReservation,
  ensureFreeMonthlyGrant,
  reserveCredits,
  settleReservation,
} from "@/lib/services/aiCreditService";
import { planCost } from "@/lib/config/aiCosts";
import {
  searchViatorProducts,
  type ViatorProductImage,
  type ViatorProductSummary,
} from "@/lib/services/viatorSearch";

type ViatorImage = ViatorProductImage;
type ViatorProduct = ViatorProductSummary;

function getBestImageUrl(images: ViatorImage[]): string {
  const cover = images.find((img) => img.isCover) ?? images[0];
  if (!cover?.variants?.length) return "";
  const sorted = [...cover.variants].sort(
    (a, b) => Math.abs(a.width - 720) - Math.abs(b.width - 720)
  );
  return sorted[0]?.url ?? "";
}

interface PlanItem {
  day: number;
  slot: "morning" | "afternoon" | "evening";
  productCode?: string | null;
  title: string;
  source: "viator" | "tip" | "free";
  notes?: string;
  href?: string | null;
  localHref?: string | null;
  imageUrl?: string;
  price?: number | null;
  rating?: number | null;
  durationMinutes?: number | null;
}

interface PlanResponse {
  title: string;
  days: number;
  items: PlanItem[];
  summary: string;
}

interface LocalDestRow {
  slug: string | null;
  title: string;
}

async function fetchLocalDestinations(): Promise<LocalDestRow[]> {
  try {
    return await prisma.destination.findMany({
      select: { slug: true, title: true },
      where: { slug: { not: null } },
    });
  } catch {
    return [];
  }
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 4);
}

function matchLocalDestination(
  title: string,
  locals: LocalDestRow[]
): string | null {
  if (!title || locals.length === 0) return null;
  const haystack = title.toLowerCase();
  let best: { slug: string; score: number } | null = null;
  for (const d of locals) {
    if (!d.slug) continue;
    const localTokens = tokenize(d.title);
    if (localTokens.length === 0) continue;
    const hits = localTokens.filter((t) => haystack.includes(t)).length;
    if (hits === 0) continue;
    const score = hits / localTokens.length;
    if (score >= 0.5 && (!best || score > best.score)) {
      best = { slug: d.slug, score };
    }
  }
  return best ? `/detail/${best.slug}` : null;
}

async function viatorSearch(query: string, count: number): Promise<ViatorProduct[]> {
  const result = await searchViatorProducts({ query, count, currency: "USD" });
  return result.products;
}

async function gatherCandidates(
  region: string | null,
  interests: string[]
): Promise<ViatorProduct[]> {
  const seen = new Map<string, ViatorProduct>();
  const queries: string[] = [];

  if (region) {
    // Region-locked: every query must include region keyword so Viator search
    // biases results toward that area. No generic "Bali tour" fallback — that
    // dilutes the pool with Ubud / Uluwatu / Nusa Penida items the user did
    // not ask for.
    queries.push(region);
    for (const i of interests) queries.push(`${region} ${i}`);
    queries.push(`${region} half day tour`);
    queries.push(`${region} private guide`);
  } else {
    if (interests.length > 0) {
      for (const i of interests) queries.push(i);
    } else {
      queries.push("Bali highlights");
    }
    queries.push("Bali tour");
  }

  const results = await Promise.all(queries.slice(0, 8).map((q) => viatorSearch(q, 20)));
  for (const list of results) {
    for (const p of list) {
      if (p.productCode && p.title && !seen.has(p.productCode)) {
        seen.set(p.productCode, p);
      }
    }
  }

  let pool = [...seen.values()];

  if (region) {
    const needle = region.toLowerCase();
    const matches = pool.filter((p) => {
      const hay = `${p.title || ""} ${p.description || ""}`.toLowerCase();
      return hay.includes(needle);
    });
    // Only swap to filtered pool when it has enough breadth, otherwise keep
    // the broader region-biased queries — empty pool forces all-tip plans.
    if (matches.length >= 6) pool = matches;
  }

  return pool.slice(0, 40);
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let reservationId: number | null = null;
  let billedUserId: number | null = null;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sign in to plan a trip" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const body = await req.json().catch(() => ({}));
    const days = Math.max(1, Math.min(parseInt(body?.days || "5"), 14));
    const budget = typeof body?.budget === "string" ? body.budget : "moderate";
    const interests: string[] = Array.isArray(body?.interests) ? body.interests.slice(0, 8) : [];
    const region: string | null = typeof body?.region === "string" ? body.region : null;
    const fromDate: string | null = typeof body?.fromDate === "string" ? body.fromDate : null;
    const toDate: string | null = typeof body?.toDate === "string" ? body.toDate : null;

    // Free-tier auto-grant before quota check
    await ensureFreeMonthlyGrant(userId).catch(() => {});

    // Credit gate: reserve before any expensive work (Viator searches + LLM).
    // Plan length differential (8 cr ≤7d, 12 cr 8–14d) preserved via planCost.
    const cost = planCost(days);
    const reserved = await reserveCredits(userId, "plan", cost);
    if (!reserved.ok) {
      await prisma.aiUsage.create({
        data: {
          userId,
          endpoint: "plan",
          creditsCost: 0,
          status: "DENIED_QUOTA",
          meta: { reason: reserved.reason, balance: reserved.remainingBalance, days },
        },
      });
      return NextResponse.json(
        {
          error: "Out of AI credits",
          reason: reserved.reason,
          balance: reserved.remainingBalance,
          upgradeUrl: "/ai/pricing",
        },
        { status: 402 }
      );
    }
    reservationId = reserved.reservationId ?? null;
    billedUserId = userId;

    const [user, prefs] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
      prisma.userPreferences.findUnique({ where: { userId } }),
    ]);

    const [candidates, localDests] = await Promise.all([
      gatherCandidates(region, interests),
      fetchLocalDestinations(),
    ]);

    const candidateLines = candidates
      .map(
        (p) =>
          `- code:${p.productCode} | title:${p.title} | priceUSD:${p.pricing?.summary?.fromPrice ?? "?"} | rating:${p.reviews?.combinedAverageRating ?? "?"} | reviews:${p.reviews?.totalReviews ?? 0} | durMin:${p.duration?.fixedDurationInMinutes ?? "?"}`
      )
      .join("\n");

    const partyLine = prefs
      ? `${prefs.partyAdults} adult, ${prefs.partyChildren} child, ${prefs.partySeniors} senior, ${prefs.partyInfants} infant`
      : "2 adult";
    const styleLine = prefs?.styleTags?.length ? prefs.styleTags.join(", ") : "general";
    const interestLine = interests.length > 0 ? interests.join(", ") : "none selected";
    const dietary = prefs?.dietary || "none";
    const mobility = prefs?.mobility || "no constraint";
    const effectiveRegion = region || prefs?.regionPref || null;
    const regionHint = effectiveRegion || "no preference";
    const regionLocked = !!effectiveRegion;

    const regionRule = regionLocked
      ? `10. REGION LOCK (CRITICAL): every item — Viator AND tip — MUST be physically located in or walking/short-drive distance (≤20 min) of "${effectiveRegion}". DO NOT recommend day trips to other regions (no Ubud, Uluwatu, Nusa Penida, Kintamani, Sidemen, Munduk, Lovina, etc. unless one of those IS the locked region). All ${days} days stay in "${effectiveRegion}". If a Viator candidate is not in this area, skip it and use a tip instead.`
      : `10. No region lock — user did not pick one. You may mix areas, but cluster nearby items per day to avoid long transfers.`;

    const interestRule = interests.length > 0
      ? `11. INTEREST LOCK: every item must clearly map to ONE of these user-selected interests: ${interests.join(", ")}. Do not insert categories outside this list (e.g. if user picked only "beaches", do not add temple tours or cooking classes).`
      : `11. No interests selected — pick a balanced mix of culture, food, nature, relaxation.`;

    const systemPrompt = `You are an expert Bali trip planner.

Output ONLY valid JSON matching this shape (no markdown, no commentary, no extra fields):
{
  "title": string,
  "days": number,
  "summary": string (1-2 sentences),
  "items": [
    {
      "day": number 1..${days},
      "slot": "morning" | "afternoon" | "evening",
      "productCode": string | null,
      "title": string,
      "source": "viator" | "tip" | "free",
      "notes": string
    }
  ]
}

HARD RULES (non-negotiable):
1. NEVER invent a productCode. If you cannot find a fit in the CANDIDATE POOL below, set productCode to null and source to "tip".
2. If you set source = "viator" then productCode MUST be one of the codes in the CANDIDATE POOL — copy it character-for-character.
3. If productCode is set, copy the candidate's title verbatim into the title field. Do not paraphrase tour titles.
4. Do NOT emit any "href", "url", or link field. We build links server-side from productCode.
5. Do NOT emit imageUrl, price, rating, or duration — server enriches from the canonical record.
6. Pace: max 3 slots/day (morning, afternoon, evening). Rest days with 1-2 slots are fine.
7. Travel time aware: Ubud↔Uluwatu = 2-3h; do not schedule both in one day. Nusa Penida is a full day.
8. Mix paid Viator tours with free tips (cafes, beaches, sunset spots, temples) so a "${budget}" budget makes sense.
9. Mornings: outdoor / activity. Afternoons: culture / food / wellness. Evenings: dinner / sunset / relax.
${regionRule}
${interestRule}
12. Title and summary MUST mention "${effectiveRegion || "Bali"}" so the user sees the region they picked is honored.

PARTY: ${partyLine}
STYLE (stored profile): ${styleLine}
INTERESTS (this trip — strict): ${interestLine}
DIETARY: ${dietary}
MOBILITY: ${mobility}
BASE REGION: ${regionHint}${regionLocked ? " (LOCKED — do not leave)" : ""}
BUDGET: ${budget}
USER: ${user?.name || "Traveler"}
${fromDate ? `FROM: ${fromDate}` : ""}
${toDate ? `TO: ${toDate}` : ""}
${
  fromDate || toDate
    ? `DATE-AWARE PLANNING:
- Consider Bali's wet season (Nov–Mar) vs dry season (Apr–Oct) when selecting outdoor vs indoor activities.
- Reflect Balinese cultural calendar in suggestions when relevant: Nyepi (Day of Silence), Galungan, Kuningan, Saraswati, Pagerwesi, Tumpek days, full-moon (Purnama) and dark-moon (Tilem) temple ceremonies, Bali Arts Festival (Jun–Jul), Ubud Writers & Readers Festival (Oct).
- If the dates fall on or near a major ceremony, propose ceremony-friendly activities (temple visits, dance performances) and warn about closures (Nyepi: airport + roads closed, all activity stops).
- Day 1 should account for travel/jetlag: lighter pace.`
    : ""
}

CANDIDATE POOL (the ONLY valid productCodes; ${candidates.length} items):
${candidateLines || "(empty — use only tips with productCode=null)"}

Respond with the JSON object only.`;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 3000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Plan my ${days}-day Bali trip. ${
            regionLocked
              ? `I want to stay in ${effectiveRegion} the WHOLE time — every day, every slot. No day trips out of ${effectiveRegion}.`
              : "No region preference."
          } Interests (strict, do not add others): ${
            interests.join(", ") || "general"
          }. Budget: ${budget}. Build the JSON now.`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    let parsed: PlanResponse;
    try {
      parsed = JSON.parse(raw);
    } catch {
      if (reservationId !== null) await cancelReservation(reservationId).catch(() => {});
      if (billedUserId !== null) {
        await prisma.aiUsage.create({
          data: {
            userId: billedUserId,
            endpoint: "plan",
            creditsCost: 0,
            durationMs: Date.now() - startedAt,
            model: "llama-3.3-70b-versatile",
            status: "ERROR",
            meta: { reason: "INVALID_JSON" },
          },
        }).catch(() => {});
      }
      return NextResponse.json({ error: "Plan generation failed; try again" }, { status: 502 });
    }

    const codeMap = new Map<string, ViatorProduct>();
    for (const c of candidates) {
      if (c.productCode) codeMap.set(c.productCode, c);
    }

    const VALID_SLOTS = new Set(["morning", "afternoon", "evening"]);

    const enriched: PlanItem[] = (parsed.items || [])
      .filter(
        (it) =>
          it &&
          typeof it.day === "number" &&
          it.day >= 1 &&
          it.day <= days &&
          typeof it.slot === "string" &&
          VALID_SLOTS.has(it.slot) &&
          typeof it.title === "string"
      )
      .slice(0, days * 3)
      .map((it) => {
        const codeRaw = typeof it.productCode === "string" ? it.productCode.trim() : "";
        const cand = codeRaw ? codeMap.get(codeRaw) : undefined;

        if (cand && cand.productCode && cand.title) {
          // Validated Viator item — overwrite title + href + media with canonical data.
          return {
            day: it.day,
            slot: it.slot,
            productCode: cand.productCode,
            title: cand.title,
            notes: typeof it.notes === "string" ? it.notes : "",
            source: "viator" as const,
            href: buildViatorProductUrl(cand.productCode, cand.title),
            localHref: matchLocalDestination(cand.title, localDests),
            imageUrl: getBestImageUrl(cand.images ?? []),
            price: cand.pricing?.summary?.fromPrice ?? null,
            rating: cand.reviews?.combinedAverageRating ?? null,
            durationMinutes: cand.duration?.fixedDurationInMinutes ?? null,
          };
        }

        // Hallucinated or no code — force tip; no href; no productCode.
        return {
          day: it.day,
          slot: it.slot,
          productCode: null,
          title: it.title,
          notes: typeof it.notes === "string" ? it.notes : "",
          source: it.source === "free" ? "free" : ("tip" as const),
          href: null,
          localHref: matchLocalDestination(it.title, localDests),
          imageUrl: undefined,
          price: null,
          rating: null,
          durationMinutes: null,
        };
      });

    // Settle reservation with actual cost (use planned cost — plan is fixed-budget).
    const tokensIn = (completion.usage?.prompt_tokens ?? null);
    const tokensOut = (completion.usage?.completion_tokens ?? null);
    const durationMs = Date.now() - startedAt;
    const actualCost = planCost(days);
    if (reservationId !== null) {
      await settleReservation(reservationId, actualCost, { tokensIn, tokensOut, durationMs }).catch(() => {});
    }
    if (billedUserId !== null) {
      await prisma.aiUsage.create({
        data: {
          userId: billedUserId,
          endpoint: "plan",
          creditsCost: actualCost,
          tokensIn,
          tokensOut,
          durationMs,
          model: "llama-3.3-70b-versatile",
          status: "OK",
          meta: { days, budget, candidates: candidates.length },
        },
      }).catch(() => {});
    }

    const viatorCount = enriched.filter((it) => it.source === "viator").length;
    const lowCoverage = candidates.length < days || viatorCount < Math.max(1, Math.floor(days / 2));

    return NextResponse.json({
      title: typeof parsed.title === "string" ? parsed.title : `${days}-day Bali plan`,
      days,
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      items: enriched,
      meta: {
        viatorCount,
        candidatePoolSize: candidates.length,
        lowCoverage,
      },
    });
  } catch (err) {
    if (reservationId !== null) await cancelReservation(reservationId).catch(() => {});
    if (billedUserId !== null) {
      await prisma.aiUsage.create({
        data: {
          userId: billedUserId,
          endpoint: "plan",
          creditsCost: 0,
          durationMs: Date.now() - startedAt,
          status: "ERROR",
          meta: { error: err instanceof Error ? err.message : "Unknown" },
        },
      }).catch(() => {});
    }
    console.error("[ai/plan]", err);
    return NextResponse.json({ error: "Plan unavailable" }, { status: 500 });
  }
}
