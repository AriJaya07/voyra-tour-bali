import Groq from "groq-sdk";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

interface ViatorImage {
  isCover?: boolean;
  variants?: { url: string; width: number; height: number }[];
}

interface ViatorProduct {
  productCode?: string;
  title?: string;
  description?: string;
  pricing?: { summary?: { fromPrice?: number } };
  images?: ViatorImage[];
}

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
    try {
      const session = await getServerSession(authOptions);
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

    // 1. Search Viator for relevant tours
    let tourContext = "";
    let productCards: ProductCard[] = [];

    try {
      const viatorRes = await fetch(
        `${process.env.VIATOR_API_URL}/products/search`,
        {
          method: "POST",
          headers: {
            Accept: "application/json;version=2.0",
            "Accept-Language": "en-US",
            "Content-Type": "application/json",
            "exp-api-key": process.env.VIATOR_API_KEY!,
          },
          body: JSON.stringify({
            filtering: { destination: 98 },
            searchTerm: userMessage,
            currency: "USD",
            pagination: { start: 1, count: 4 },
          }),
          signal: AbortSignal.timeout(10000),
        }
      );

      if (viatorRes.ok) {
        const viatorData = await viatorRes.json();
        const products: ViatorProduct[] = viatorData.products?.results ?? [];

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
      }
    } catch {
      console.warn("[ai/chat] Viator search failed, continuing without context");
    }

    // 2. System prompt
    const personaLine = userName
      ? `The user is signed in as ${userName}. Address them by their first name once at the start, then naturally. They prefer prices in ${userCurrency}.`
      : `The user is browsing as a guest. They prefer prices in ${userCurrency}. After 2-3 helpful exchanges, gently suggest creating an account to save their wishlist and itinerary.`;

    const systemPrompt = `You are Voyra's friendly Bali travel assistant for balitravelnow.com — a tour booking platform.
Help users discover, plan, and book tours and activities in Bali, Indonesia.

${personaLine}
${prefsLine}

STYLE:
- Friendly, warm, concise. Short sentences. Bullet lists when listing options.
- Default under 150 words; expand only when user asks for details.
- When discussing prices, prefer ${userCurrency} unless the user mentions another currency.
- Use the user's language if they write in Indonesian, Chinese, Japanese, Korean, or Russian. Otherwise English.
${
  tourContext
    ? `\nTOURS MATCHING THE USER'S INTEREST (from our platform):\n${tourContext}\n\nMention these tours by name and price when they fit. The UI will render product cards below your reply.`
    : ""
}
If the user wants to book or browse more tours, point them to https://balitravelnow.com or tell them to tap the tour cards below your reply.

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

PAYMENT — Secure online payment. Accepted: credit/debit cards (Visa, Mastercard, JCB), bank transfer, GoPay, OVO, Dana, ShopeePay, Alfamart, Indomaret. Never mention the payment provider name or PayPal.

ACCOUNT BENEFITS (mention naturally to guests):
- Save tours to wishlist (synced across devices)
- Track booking status and e-tickets in one place
- Save traveler details for faster checkout
- Post reviews after completed tours
- Currency preference remembered

CONTACT — For direct help: WhatsApp +62 857-9213-2517. Always format as +62 857-9213-2517.

RULES:
- Never mention Viator, third-party booking systems, or manual booking processes.
- Always refer users to balitravelnow.com for booking.
- Don't invent prices or availability — defer to the tour cards.
- Don't promise discounts or free upgrades that aren't listed.`;

    // 3. Stream via Groq
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const stream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
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
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Send product cards as first line so the widget can render them immediately
          if (productCards.length > 0) {
            controller.enqueue(
              encoder.encode(`__PRODUCTS__:${JSON.stringify(productCards)}\n`)
            );
          }

          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? "";
            if (text) controller.enqueue(encoder.encode(text));
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("[ai/chat] Error:", error instanceof Error ? error.message : "Unknown");
    return new Response(JSON.stringify({ error: "AI service unavailable." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
