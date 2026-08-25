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
 * On-demand travel-content translation (Proposal E). Preserves Markdown structure
 * and Balinese/Indonesian proper nouns. 2 credits/block. Cache on the client per
 * (content, language) to avoid re-charging.
 */

import { GROQ_MODEL as MODEL } from "@/lib/config/aiModel";

const LANGS: Record<string, string> = {
  id: "Indonesian",
  "zh": "Simplified Chinese",
  ja: "Japanese",
  ko: "Korean",
  fr: "French",
  de: "German",
  es: "Spanish",
  nl: "Dutch",
  ru: "Russian",
};

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let reservationId: number | null = null;
  const ENDPOINT = "translate" as const;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const body = await req.json().catch(() => ({}));
    const text = typeof body?.text === "string" ? body.text.slice(0, 12000) : "";
    const targetLang = typeof body?.targetLang === "string" ? body.targetLang : "";
    const langName = LANGS[targetLang];
    if (!text.trim()) {
      return NextResponse.json({ error: "Nothing to translate" }, { status: 400 });
    }
    if (!langName) {
      return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
    }

    await ensureFreeMonthlyGrant(userId).catch(() => {});
    const reserved = await reserveCredits(userId, ENDPOINT, AI_ENDPOINT_COST.translate);
    if (!reserved.ok) {
      return NextResponse.json(
        { error: "Out of AI credits", reason: reserved.reason, balance: reserved.remainingBalance, upgradeUrl: "/ai/pricing" },
        { status: 402 }
      );
    }
    reservationId = reserved.reservationId ?? null;

    const systemPrompt = `You are a professional travel translator. Translate the user's text into ${langName}.

RULES
- Preserve Markdown exactly (headings, lists, links, emphasis). Translate only human-readable text.
- Keep proper nouns (Ubud, Nyepi, Galungan, Canggu, Voyra, place/temple names) untranslated.
- Keep prices, codes, and URLs unchanged.
- Natural, fluent travel tone. Output ONLY the translated text — no preamble.`;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 4000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
    });

    const translated = completion.choices[0]?.message?.content ?? "";
    const tokensIn = completion.usage?.prompt_tokens ?? null;
    const tokensOut = completion.usage?.completion_tokens ?? null;
    const durationMs = Date.now() - startedAt;
    const actualCost = Math.max(AI_ENDPOINT_COST.translate, settledChatCost(tokensIn ?? 0, tokensOut ?? 0));
    if (reservationId !== null) {
      await settleReservation(reservationId, actualCost, { tokensIn, tokensOut, durationMs }).catch(() => {});
    }
    await prisma.aiUsage
      .create({
        data: { userId, endpoint: ENDPOINT, creditsCost: actualCost, tokensIn, tokensOut, durationMs, model: MODEL, status: "OK", meta: { targetLang } },
      })
      .catch(() => {});

    return NextResponse.json({ translated, lang: targetLang });
  } catch (error) {
    if (reservationId !== null) await cancelReservation(reservationId).catch(() => {});
    console.error("[ai/translate]", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json({ error: "Translation unavailable" }, { status: 500 });
  }
}
