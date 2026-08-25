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
 * Product Q&A (Proposal B) — grounded answer about ONE tour/destination.
 *
 * Grounds strictly in the product's own data. For Voyra destinations, pass
 * destinationId (server fetches the fields). For Viator products (not in DB),
 * pass `context` text from the already-loaded page. 2 credits/question.
 */

import { GROQ_MODEL as MODEL } from "@/lib/config/aiModel";

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let reservationId: number | null = null;
  const ENDPOINT = "product_qa" as const;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const body = await req.json().catch(() => ({}));
    const question = typeof body?.question === "string" ? body.question.trim().slice(0, 400) : "";
    const destinationId = Number.isFinite(Number(body?.destinationId)) ? Number(body.destinationId) : null;
    let context = typeof body?.context === "string" ? body.context.slice(0, 4000) : "";
    if (!question) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    // Prefer server-fetched Voyra data when a destinationId is given (trusted ground truth).
    if (destinationId) {
      const dest = await prisma.destination.findFirst({
        where: { id: destinationId },
        select: {
          title: true,
          description: true,
          price: true,
          category: { select: { name: true } },
          locations: { select: { title: true, description: true }, take: 20 },
          contents: { select: { title: true, description: true }, take: 20 },
        },
      });
      if (dest) {
        const locs = dest.locations.map((l) => `- ${l.title}${l.description ? `: ${l.description}` : ""}`).join("\n");
        const cont = dest.contents.map((c) => `- ${c.title}${c.description ? `: ${c.description}` : ""}`).join("\n");
        context = [
          `TITLE: ${dest.title}`,
          dest.category?.name ? `CATEGORY: ${dest.category.name}` : "",
          typeof dest.price === "number" ? `FROM PRICE (IDR): ${dest.price}` : "",
          `DESCRIPTION: ${dest.description}`,
          locs ? `LOCATIONS:\n${locs}` : "",
          cont ? `HIGHLIGHTS:\n${cont}` : "",
        ]
          .filter(Boolean)
          .join("\n\n")
          .slice(0, 6000);
      }
    }

    if (!context) {
      return NextResponse.json({ error: "No product context to answer from" }, { status: 400 });
    }

    await ensureFreeMonthlyGrant(userId).catch(() => {});
    const reserved = await reserveCredits(userId, ENDPOINT, AI_ENDPOINT_COST.product_qa);
    if (!reserved.ok) {
      return NextResponse.json(
        { error: "Out of AI credits", reason: reserved.reason, balance: reserved.remainingBalance, upgradeUrl: "/ai/pricing" },
        { status: 402 }
      );
    }
    reservationId = reserved.reservationId ?? null;

    const systemPrompt = `You answer a traveler's question about ONE specific Bali tour/experience, using ONLY the product data below.

PRODUCT DATA
${context}

RULES
- Answer ONLY from the product data. If it doesn't say, respond: "The listing doesn't specify — check availability or contact support." Do NOT guess prices, pickup, or accessibility.
- Be concise and direct (under 90 words). Friendly, factual tone.
- If asked to compare with other tours, decline politely — you only know this one.`;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 300,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
    });

    const reply = completion.choices[0]?.message?.content ?? "";
    const tokensIn = completion.usage?.prompt_tokens ?? null;
    const tokensOut = completion.usage?.completion_tokens ?? null;
    const durationMs = Date.now() - startedAt;
    const actualCost = Math.max(AI_ENDPOINT_COST.product_qa, settledChatCost(tokensIn ?? 0, tokensOut ?? 0));
    if (reservationId !== null) {
      await settleReservation(reservationId, actualCost, { tokensIn, tokensOut, durationMs }).catch(() => {});
    }
    await prisma.aiUsage
      .create({
        data: { userId, endpoint: ENDPOINT, creditsCost: actualCost, tokensIn, tokensOut, durationMs, model: MODEL, status: "OK" },
      })
      .catch(() => {});

    return NextResponse.json({ reply });
  } catch (error) {
    if (reservationId !== null) await cancelReservation(reservationId).catch(() => {});
    console.error("[ai/product-qa]", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json({ error: "Product assistant unavailable" }, { status: 500 });
  }
}
