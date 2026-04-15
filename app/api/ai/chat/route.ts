import Groq from "groq-sdk";
import { NextRequest } from "next/server";

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
    const systemPrompt = `You are a helpful Bali travel assistant for Bali Travel Now (balitravelnow.com), a tour booking platform.
Help users discover and book tours and activities in Bali, Indonesia.
Be friendly, concise, and recommend specific tours when relevant.
Keep answers under 150 words unless user asks for details.
${
  tourContext
    ? `\nHere are tours from our platform that match the user's interest:\n${tourContext}\n\nMention these tours by name and price when relevant.`
    : ""
}
If the user wants to book or browse more tours, direct them to https://balitravelnow.com or tell them to click the tour cards below.
IMPORTANT — Payment: We use Midtrans as our payment gateway. Accepted methods through Midtrans include credit/debit cards (Visa, Mastercard, JCB), bank transfer, GoPay, OVO, Dana, ShopeePay, Alfamart, and Indomaret. Never mention PayPal or any other payment method not listed here.`;

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
    console.error("[ai/chat] Error:", error);
    return new Response(JSON.stringify({ error: "AI service unavailable." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
