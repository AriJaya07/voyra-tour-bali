import Groq from "groq-sdk";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import {
  cancelReservation,
  ensureFreeMonthlyGrant,
  reserveCredits,
  settleReservation,
} from "@/lib/services/aiCreditService";
import { consumeGuest, logGuestUsage } from "@/lib/services/aiGuestQuota";
import { AI_ENDPOINT_COST, settledChatCost } from "@/lib/config/aiCosts";
import { GROQ_MODEL } from "@/lib/config/aiModel";
import { VOYRA_KNOWLEDGE_BASE } from "@/lib/config/aiKnowledgeBase";
import {
  searchViatorProducts,
  type ViatorProductImage,
  type ViatorProductSummary,
} from "@/lib/services/viatorSearch";

type ViatorImage = ViatorProductImage;
type ViatorProduct = ViatorProductSummary;

interface ProductCard {
  productCode: string;
  title: string;
  imageUrl: string;
  price: number | null;
}

function getBestImageUrl(images: ViatorImage[]): string {
  const cover = images.find((img) => img.isCover) ?? images[0];
  if (!cover?.variants?.length) return "";
  const sorted = [...cover.variants].sort(
    (a, b) => Math.abs(a.width - 720) - Math.abs(b.width - 720)
  );
  return sorted[0]?.url ?? "";
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let reservationId: number | null = null;
  let billedUserId: number | null = null;
  let guestIpHash: string | null = null;
  const ENDPOINT = "chat" as const;

  try {
    const { messages, userMessage } = await req.json();

    if (!userMessage?.trim()) {
      return new Response(JSON.stringify({ error: "Message is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 0. Personalize from session (auth optional)
    let userName: string | null = null;
    let userCurrency = "IDR";
    let prefsLine = "";
    const session = await getServerSession(authOptions);
    try {
      if (session?.user?.id) {
        const userId = parseInt(session.user.id);
        const [u, prefs] = await Promise.all([
          prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, currency: true },
          }),
          prisma.userPreferences.findUnique({ where: { userId } }),
        ]);
        if (u) {
          userName = u.name;
          userCurrency = u.currency || "IDR";
        }
        if (prefs) {
          const partyParts: string[] = [];
          if (prefs.partyAdults > 0) partyParts.push(`${prefs.partyAdults} adult${prefs.partyAdults > 1 ? "s" : ""}`);
          if (prefs.partyChildren > 0) partyParts.push(`${prefs.partyChildren} child${prefs.partyChildren > 1 ? "ren" : ""}`);
          if (prefs.partySeniors > 0) partyParts.push(`${prefs.partySeniors} senior${prefs.partySeniors > 1 ? "s" : ""}`);
          if (prefs.partyInfants > 0) partyParts.push(`${prefs.partyInfants} infant${prefs.partyInfants > 1 ? "s" : ""}`);

          const bits: string[] = [];
          if (partyParts.length > 0) bits.push(`Party: ${partyParts.join(", ")}.`);
          if (prefs.styleTags.length > 0) bits.push(`Travel style: ${prefs.styleTags.join(", ")}.`);
          if (prefs.regionPref) bits.push(`Staying in ${prefs.regionPref}.`);
          if (prefs.tripLengthDays) bits.push(`Trip length ~${prefs.tripLengthDays} days.`);
          if (prefs.dietary) bits.push(`Dietary: ${prefs.dietary}.`);
          if (prefs.mobility) bits.push(`Mobility note: ${prefs.mobility}.`);

          if (bits.length > 0) {
            prefsLine = `\nUSER TRAVEL PROFILE — use this to filter and rank suggestions:\n${bits.join(" ")}\nWhen recommending, prefer tours that match the style + region; avoid ones that conflict with mobility or dietary needs. If staying in a specific region, prefer tours with pickup in that zone (Ubud↔Uluwatu = 2-3h drive).`;
          }
        }
      }
    } catch {
      // non-fatal — fallback to guest mode
    }

    // 0a. Credit gate (auth users → reserve credits; guests → IP quota)
    if (session?.user?.id) {
      const userId = parseInt(session.user.id);
      // Free-tier auto-grant: 20 credits/UTC-month for users without paid sub.
      await ensureFreeMonthlyGrant(userId).catch(() => {});
      const reserved = await reserveCredits(userId, ENDPOINT, AI_ENDPOINT_COST.chat);
      if (!reserved.ok) {
        await prisma.aiUsage.create({
          data: {
            userId,
            endpoint: ENDPOINT,
            creditsCost: 0,
            status: "DENIED_QUOTA",
            meta: { reason: reserved.reason, balance: reserved.remainingBalance },
          },
        });
        return new Response(
          JSON.stringify({
            error: "Out of AI credits",
            reason: reserved.reason,
            balance: reserved.remainingBalance,
            upgradeUrl: "/ai/pricing",
          }),
          { status: 402, headers: { "Content-Type": "application/json" } }
        );
      }
      reservationId = reserved.reservationId ?? null;
      billedUserId = userId;
    } else {
      const guest = await consumeGuest(req, ENDPOINT);
      guestIpHash = guest.ipHash;
      if (!guest.ok) {
        return new Response(
          JSON.stringify({
            error: "Guest AI quota reached. Sign in for more.",
            reason: "QUOTA",
            used: guest.used,
            limit: guest.limit,
            upgradeUrl: "/register",
          }),
          { status: 402, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // 1. Search Viator for relevant tours
    let tourContext = "";
    let productCards: ProductCard[] = [];

    try {
      const result = await searchViatorProducts({
        query: userMessage,
        currency: "USD",
        count: 4,
      });
      const products: ViatorProduct[] = result.products;

      if (products.length > 0) {
        tourContext = products
          .map(
            (p) =>
              `- ${p.title ?? "Tour"}: ${(p.description ?? "").slice(0, 150)} | From $${p.pricing?.summary?.fromPrice ?? "?"} USD`
          )
          .join("\n");

        productCards = products
          .filter((p) => p.productCode && p.title)
          .map((p) => ({
            productCode: p.productCode!,
            title: p.title!,
            imageUrl: getBestImageUrl(p.images ?? []),
            price: p.pricing?.summary?.fromPrice ?? null,
          }));
      }
    } catch {
      console.warn("[ai/chat] Viator search failed, continuing without context");
    }

    // 2. System prompt
    const personaLine = userName
      ? `The user is signed in as ${userName}. Address them by their first name once at the start, then naturally. They prefer prices in ${userCurrency}.`
      : `The user is browsing as a guest. They prefer prices in ${userCurrency}. After 2-3 helpful exchanges, gently suggest creating an account to save their wishlist and itinerary.`;

    const systemPrompt = `You are Voyra's friendly Bali travel assistant for balitravelnow.com — a tour booking + AI planning platform.
Help users discover, plan, and book tours and activities in Bali, Indonesia. Also answer transparent questions about how Voyra works (credits, plans, features, navigation).

${personaLine}
${prefsLine}

STYLE:
- Friendly, warm, concise. Short sentences. Bullet lists when listing options.
- Default under 150 words; expand only when user asks for details.
- When discussing prices, prefer ${userCurrency} unless the user mentions another currency.
- Use the user's language if they write in Indonesian, Chinese, Japanese, Korean, or Russian. Otherwise English.
- When the answer involves a Voyra page, refer to it by its friendly name with the breadcrumb path (e.g. "the AI Wallet — AI Tools → Wallet"). NEVER dump a raw URL like "/ai/wallet" in chat.
${
  tourContext
    ? `\nTOURS MATCHING THE USER'S INTEREST (from our platform):\n${tourContext}\n\nMention these tours by name and price when they fit. The UI will render product cards below your reply.`
    : ""
}
If the user wants to book or browse more tours, point them to balitravelnow.com or tell them to tap the tour cards below your reply.

BALI EXPERTISE — when relevant, share local tips:
- Best time of day (sunrise/sunset for Mt Batur/Tanah Lot/Uluwatu).
- Travel-time awareness: Ubud↔Uluwatu = 2-3h; don't pair both in same day.
- Cultural notes: temples need sarong + sash; Nyepi day = full island shutdown.
- Weather: dry season Apr-Oct, wet Nov-Mar; afternoon rain common.
- Money: ATMs work but skim risk; bring small bills for offering boxes.
- Transport: Grab/Gojek work in cities, not in many tour areas — book pickup.

BOOKING PROCESS — When users ask how to book:
1. Browse & choose a tour on balitravelnow.com
2. Select travel date and number of travelers
3. Fill in personal details (full name, email, phone number)
4. Review order summary
5. Complete secure payment
6. Receive booking confirmation by email
7. View booking status and e-ticket in Profile

CONTACT — For direct help: WhatsApp +62 857-9213-2517. Always format as +62 857-9213-2517.

${VOYRA_KNOWLEDGE_BASE}

RULES:
- Never mention Viator, Midtrans, or any third-party booking/payment provider name.
- Always refer users to balitravelnow.com for booking.
- Don't invent prices or availability — defer to the tour cards.
- Don't promise discounts or free upgrades that aren't listed.
- DO NOT state a numeric AI credit balance. The credit number lives only on the AI Wallet (anxiety-free policy). When asked about balance, point the user to "AI Wallet — Profile → AI Wallet" and offer to explain the bucket breakdown.
- Don't fabricate features. Use only the facts in the knowledge base above.`;

    // 3. Stream via Groq
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const stream = await groq.chat.completions.create({
      model: GROQ_MODEL,
      stream: true,
      max_tokens: 500,
      messages: [
        { role: "system", content: systemPrompt },
        ...(Array.isArray(messages) ? messages : []),
        { role: "user", content: userMessage },
      ],
    });

    // 4. Stream response: first line = product cards JSON, then stream AI text
    const encoder = new TextEncoder();
    let outChars = 0;
    const inputCharsApprox = JSON.stringify({ systemPrompt, messages, userMessage }).length;
    const readable = new ReadableStream({
      async start(controller) {
        let streamFailed = false;
        try {
          // Send product cards as first line so the widget can render them immediately
          if (productCards.length > 0) {
            controller.enqueue(
              encoder.encode(`__PRODUCTS__:${JSON.stringify(productCards)}\n`)
            );
          }

          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? "";
            if (text) {
              outChars += text.length;
              controller.enqueue(encoder.encode(text));
            }
          }
        } catch (err) {
          streamFailed = true;
          console.error("[ai/chat] Stream error:", err instanceof Error ? err.message : err);
        } finally {
          controller.close();

          // Settle / cancel reservation + log usage
          const tokensIn = Math.ceil(inputCharsApprox / 4);
          const tokensOut = Math.ceil(outChars / 4);
          const durationMs = Date.now() - startedAt;

          if (billedUserId !== null) {
            if (streamFailed && reservationId !== null) {
              await cancelReservation(reservationId).catch(() => {});
              await prisma.aiUsage.create({
                data: {
                  userId: billedUserId,
                  endpoint: ENDPOINT,
                  creditsCost: 0,
                  tokensIn,
                  tokensOut,
                  durationMs,
                  model: GROQ_MODEL,
                  status: "ERROR",
                },
              }).catch(() => {});
            } else if (reservationId !== null) {
              const cost = settledChatCost(tokensIn, tokensOut);
              await settleReservation(reservationId, cost, { tokensIn, tokensOut, durationMs }).catch(() => {});
              await prisma.aiUsage.create({
                data: {
                  userId: billedUserId,
                  endpoint: ENDPOINT,
                  creditsCost: cost,
                  tokensIn,
                  tokensOut,
                  durationMs,
                  model: GROQ_MODEL,
                  status: "OK",
                },
              }).catch(() => {});
            }
          } else if (guestIpHash) {
            await logGuestUsage({
              ipHash: guestIpHash,
              endpoint: ENDPOINT,
              tokensIn,
              tokensOut,
              durationMs,
              model: GROQ_MODEL,
              status: streamFailed ? "ERROR" : "OK",
            }).catch(() => {});
          }
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    if (reservationId !== null) {
      await cancelReservation(reservationId).catch(() => {});
    }
    console.error("[ai/chat] Error:", error instanceof Error ? error.message : "Unknown");
    return new Response(JSON.stringify({ error: "AI service unavailable." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
