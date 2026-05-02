import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import { buildViatorProductUrl, VIATOR_HEADERS, viatorSignal } from "@/lib/config/viator";

interface ViatorImage {
  isCover?: boolean;
  variants?: { url: string; width: number; height: number }[];
}

interface ViatorProduct {
  productCode?: string;
  title?: string;
  description?: string;
  pricing?: { summary?: { fromPrice?: number }; currency?: string };
  reviews?: { totalReviews?: number; combinedAverageRating?: number };
  duration?: { fixedDurationInMinutes?: number };
  images?: ViatorImage[];
  tags?: number[];
}

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

async function viatorSearch(query: string, count: number): Promise<ViatorProduct[]> {
  if (!process.env.VIATOR_API_KEY) return [];
  try {
    const res = await fetch(`${process.env.VIATOR_API_URL}/products/search`, {
      method: "POST",
      headers: { ...VIATOR_HEADERS, "Accept-Currency": "USD" },
      body: JSON.stringify({
        filtering: { destination: 98 },
        searchTerm: query,
        currency: "USD",
        sorting: { sort: "TRAVELER_RATING", order: "DESCENDING" },
        pagination: { start: 1, count },
      }),
      signal: viatorSignal(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    // Viator returns products as a flat array. Older shape `products.results` is empty here.
    const arr = Array.isArray(data?.products) ? data.products : [];
    return arr as ViatorProduct[];
  } catch {
    return [];
  }
}

async function gatherCandidates(
  region: string | null,
  interests: string[]
): Promise<ViatorProduct[]> {
  const seen = new Map<string, ViatorProduct>();
  const queries: string[] = [];
  if (region) queries.push(region);
  for (const i of interests) queries.push(i);
  if (queries.length === 0) queries.push("Bali highlights");
  // Always seed with broad pool so AI has something to fall back to.
  queries.push("Bali tour");

  const results = await Promise.all(queries.slice(0, 6).map((q) => viatorSearch(q, 12)));
  for (const list of results) {
    for (const p of list) {
      if (p.productCode && p.title && !seen.has(p.productCode)) {
        seen.set(p.productCode, p);
      }
    }
  }
  return [...seen.values()].slice(0, 30);
}

export async function POST(req: NextRequest) {
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

    const [user, prefs] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
      prisma.userPreferences.findUnique({ where: { userId } }),
    ]);

    const candidates = await gatherCandidates(region, interests);

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
    const dietary = prefs?.dietary || "none";
    const mobility = prefs?.mobility || "no constraint";
    const regionHint = region || prefs?.regionPref || "no preference";

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

PARTY: ${partyLine}
STYLE: ${styleLine}
DIETARY: ${dietary}
MOBILITY: ${mobility}
BASE REGION: ${regionHint}
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
          content: `Plan my ${days}-day Bali trip. Interests: ${
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
          imageUrl: undefined,
          price: null,
          rating: null,
          durationMinutes: null,
        };
      });

    return NextResponse.json({
      title: typeof parsed.title === "string" ? parsed.title : `${days}-day Bali plan`,
      days,
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      items: enriched,
    });
  } catch (err) {
    console.error("[ai/plan]", err);
    return NextResponse.json({ error: "Plan unavailable" }, { status: 500 });
  }
}
