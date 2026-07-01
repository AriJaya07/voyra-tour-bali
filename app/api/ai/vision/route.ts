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
import { AI_ENDPOINT_COST } from "@/lib/config/aiCosts";

/**
 * Snap Bali (Feature 5) — camera vision companion.
 *
 * Generalises the existing voucher-vision capability to two in-trip intents:
 *   - identify: point at a temple / dish / offering → what it is + cultural
 *               note + bookable "explore similar" suggestions from the catalog.
 *   - menu:     translate a menu / sign into English with short notes.
 *
 * Vision is Anthropic Claude (Groq has no vision). Env-gated exactly like the
 * voucher reader: ENABLE_AI_VISION=true + ANTHROPIC_API_KEY, else 503. Billed
 * under the shared vision cost (5 credits).
 */

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const ENDPOINT = "voucher_read" as const; // shared vision billing/telemetry bucket

interface IdentifyResult {
  label: string | null;
  whatItIs: string | null;
  culturalNote: string | null;
  etiquette: string | null;
  searchKeywords: string[];
}

interface MenuResult {
  items: { original: string; english: string; note: string | null }[];
}

const IDENTIFY_PROMPT = `You are a knowledgeable Bali local guide. Identify the main subject in this photo (a temple, landmark, beach, dish, offering, ceremony item, etc.).
Return ONLY JSON:
{
  "label": string | null,          // short name, e.g. "Canang sari offering"
  "whatItIs": string | null,       // 1-2 sentence explanation
  "culturalNote": string | null,   // significance / context, or null
  "etiquette": string | null,      // respectful behaviour tip if relevant, or null
  "searchKeywords": string[]       // 2-4 lowercase keywords to find related Bali tours (e.g. ["temple","uluwatu"])
}
Rules: be accurate, do not invent specifics. If unsure of the exact place, describe the type. JSON only.`;

const MENU_PROMPT = `Translate the menu/sign text in this image into English.
Return ONLY JSON:
{ "items": [ { "original": string, "english": string, "note": string | null } ] }
Keep dish proper nouns (Nasi Goreng, Babi Guling) and add a short "note" only when helpful (e.g. "spicy", "pork"). JSON only.`;

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let reservationId: number | null = null;

  try {
    if ((process.env.ENABLE_AI_VISION ?? "").toLowerCase() !== "true" || !process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Vision is not enabled on this deployment.", reason: "FEATURE_DISABLED" },
        { status: 503 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const form = await req.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: "Multipart form expected" }, { status: 400 });

    const file = form.get("file");
    const intent = String(form.get("intent") ?? "identify") === "menu" ? "menu" : "identify";
    if (!(file instanceof File)) return NextResponse.json({ error: "File missing" }, { status: 400 });
    if (file.size === 0) return NextResponse.json({ error: "Empty file" }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large (max 8MB)" }, { status: 400 });
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json({ error: "Only JPG / PNG / WEBP supported" }, { status: 400 });
    }

    await ensureFreeMonthlyGrant(userId).catch(() => {});
    const reserved = await reserveCredits(userId, ENDPOINT, AI_ENDPOINT_COST.voucher_read);
    if (!reserved.ok) {
      return NextResponse.json(
        { error: "Out of AI credits", reason: reserved.reason, balance: reserved.remainingBalance, upgradeUrl: "/ai/pricing" },
        { status: 402 }
      );
    }
    reservationId = reserved.reservationId ?? null;

    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const model = process.env.AI_VISION_MODEL ?? "claude-haiku-4-5-20251001";
    const prompt = intent === "menu" ? MENU_PROMPT : IDENTIFY_PROMPT;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: file.type, data: base64 } },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text().catch(() => "");
      throw new Error(`Anthropic API ${anthropicRes.status}: ${errBody.slice(0, 200)}`);
    }

    const anthropicJson = (await anthropicRes.json()) as {
      content: { type: string; text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const rawText = anthropicJson.content?.find((b) => b.type === "text")?.text ?? "{}";
    const cleaned = rawText.replace(/```json\s*/i, "").replace(/```\s*$/, "").trim();

    const durationMs = Date.now() - startedAt;
    const tokensIn = anthropicJson.usage?.input_tokens ?? null;
    const tokensOut = anthropicJson.usage?.output_tokens ?? null;

    if (intent === "menu") {
      let result: MenuResult = { items: [] };
      try {
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed.items)) {
          result.items = parsed.items
            .filter((it: unknown) => typeof it === "object" && it !== null)
            .map((it: { original?: unknown; english?: unknown; note?: unknown }) => ({
              original: String(it.original ?? ""),
              english: String(it.english ?? ""),
              note: typeof it.note === "string" ? it.note : null,
            }))
            .slice(0, 40);
        }
      } catch {
        throw new Error("Vision returned non-JSON response");
      }
      await settleAndLog(userId, reservationId, tokensIn, tokensOut, durationMs, model, intent);
      reservationId = null;
      return NextResponse.json({ intent, result });
    }

    // identify
    let result: IdentifyResult = { label: null, whatItIs: null, culturalNote: null, etiquette: null, searchKeywords: [] };
    try {
      const parsed = JSON.parse(cleaned);
      result = {
        label: typeof parsed.label === "string" ? parsed.label : null,
        whatItIs: typeof parsed.whatItIs === "string" ? parsed.whatItIs : null,
        culturalNote: typeof parsed.culturalNote === "string" ? parsed.culturalNote : null,
        etiquette: typeof parsed.etiquette === "string" ? parsed.etiquette : null,
        searchKeywords: Array.isArray(parsed.searchKeywords)
          ? parsed.searchKeywords.filter((k: unknown) => typeof k === "string").slice(0, 4)
          : [],
      };
    } catch {
      throw new Error("Vision returned non-JSON response");
    }

    // Ground "explore similar" in the real catalog.
    let suggestions: { title: string; slug: string; href: string }[] = [];
    if (result.searchKeywords.length > 0) {
      const rows = await prisma.destination.findMany({
        where: {
          slug: { not: null },
          OR: result.searchKeywords.flatMap((k) => [
            { title: { contains: k, mode: "insensitive" as const } },
            { description: { contains: k, mode: "insensitive" as const } },
          ]),
        },
        select: { title: true, slug: true },
        take: 4,
      });
      suggestions = rows
        .filter((r) => r.slug)
        .map((r) => ({ title: r.title, slug: r.slug as string, href: `/detail/${r.slug}` }));
    }

    await settleAndLog(userId, reservationId, tokensIn, tokensOut, durationMs, model, intent);
    reservationId = null;
    return NextResponse.json({ intent, result, suggestions });
  } catch (error) {
    if (reservationId !== null) await cancelReservation(reservationId).catch(() => {});
    console.error("[ai/vision]", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json({ error: "Vision unavailable" }, { status: 500 });
  }
}

async function settleAndLog(
  userId: number,
  reservationId: number | null,
  tokensIn: number | null,
  tokensOut: number | null,
  durationMs: number,
  model: string,
  intent: string
) {
  const cost = AI_ENDPOINT_COST.voucher_read;
  if (reservationId !== null) {
    await settleReservation(reservationId, cost, { tokensIn, tokensOut, durationMs, intent }).catch(() => {});
  }
  await prisma.aiUsage
    .create({
      data: { userId, endpoint: ENDPOINT, creditsCost: cost, tokensIn, tokensOut, durationMs, model, status: "OK", meta: { intent } },
    })
    .catch(() => {});
}
