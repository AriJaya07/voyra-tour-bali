/**
 * AI Tool Runtime (F2) — the substrate that turns the assistant from advisory
 * into actionable. A bounded Groq tool-calling loop exposing SAFE, read-only /
 * draft-only tools. It NEVER charges money or writes a booking — the most it
 * produces is a priced "draft cart" the user reviews and confirms through the
 * existing checkout. All prices are resolved server-side from the DB, so the
 * model cannot hallucinate a price.
 */

import Groq from "groq-sdk";
import { prisma } from "@/lib/prisma";

import { GROQ_MODEL as MODEL } from "@/lib/config/aiModel";
const MAX_HOPS = 4;

export interface DraftItem {
  title: string;
  priceIdr: number;
  source: "local";
  slug: string;
  href: string;
}

export interface DraftCart {
  items: DraftItem[];
  totalIdr: number;
  note: string;
}

export interface AgentResult {
  reply: string;
  draft: DraftCart | null;
  toolsUsed: string[];
  tokensIn: number;
  tokensOut: number;
}

// ---------------------------------------------------------------------------
// Tool definitions (advertised to the model)
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "search_tours",
      description:
        "Search the Voyra catalog of Bali tours and experiences by keywords. Returns matching tours with their real IDR price and slug. Use before proposing anything to a user.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Keywords, e.g. 'ubud waterfall', 'nusa penida snorkel'" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_my_trips",
      description: "Get the signed-in user's upcoming confirmed bookings and saved trips.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "build_draft_cart",
      description:
        "Assemble a draft booking cart from tour slugs the user wants. Prices are re-resolved server-side (never trust your own numbers). Returns a priced draft the user will review and pay for themselves — this does NOT book or charge anything.",
      parameters: {
        type: "object",
        properties: {
          slugs: {
            type: "array",
            items: { type: "string" },
            description: "The slugs of catalog tours to include (from search_tours results).",
          },
        },
        required: ["slugs"],
      },
    },
  },
] as const;

// ---------------------------------------------------------------------------
// Tool executors (bound to a userId)
// ---------------------------------------------------------------------------

async function searchTours(query: string): Promise<Array<{ title: string; priceIdr: number; slug: string }>> {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3).slice(0, 6);
  if (words.length === 0) return [];

  const rows = await prisma.destination.findMany({
    where: {
      slug: { not: null },
      OR: words.flatMap((w) => [
        { title: { contains: w, mode: "insensitive" as const } },
        { description: { contains: w, mode: "insensitive" as const } },
      ]),
    },
    select: { title: true, price: true, slug: true },
    take: 8,
  });

  return rows
    .filter((r) => r.slug)
    .map((r) => ({ title: r.title, priceIdr: Math.round(r.price ?? 0), slug: r.slug as string }));
}

async function getMyTrips(userId: number): Promise<{ upcoming: Array<{ title: string; date: string | null }> }> {
  const now = new Date();
  const [bookings, trips] = await Promise.all([
    prisma.booking.findMany({
      where: { userId, status: "CONFIRMED", travelDate: { gte: now } },
      orderBy: { travelDate: "asc" },
      take: 5,
      select: { productTitle: true, travelDate: true },
    }),
    prisma.importedTrip.findMany({
      where: { userId, travelDate: { gte: now } },
      orderBy: { travelDate: "asc" },
      take: 5,
      select: { productTitle: true, travelDate: true },
    }),
  ]);
  const upcoming = [
    ...bookings.map((b) => ({ title: b.productTitle, date: b.travelDate?.toISOString().slice(0, 10) ?? null })),
    ...trips.map((t) => ({ title: t.productTitle, date: t.travelDate?.toISOString().slice(0, 10) ?? null })),
  ];
  return { upcoming };
}

async function buildDraftCart(slugs: string[]): Promise<DraftCart> {
  const unique = Array.from(new Set(slugs.filter((s) => typeof s === "string" && s.length > 0))).slice(0, 8);
  if (unique.length === 0) {
    return { items: [], totalIdr: 0, note: "No tours were selected." };
  }
  const rows = await prisma.destination.findMany({
    where: { slug: { in: unique } },
    select: { title: true, price: true, slug: true },
  });

  const items: DraftItem[] = rows
    .filter((r) => r.slug)
    .map((r) => ({
      title: r.title,
      priceIdr: Math.round(r.price ?? 0),
      source: "local" as const,
      slug: r.slug as string,
      href: `/detail/${r.slug}`,
    }));

  const totalIdr = items.reduce((acc, i) => acc + i.priceIdr, 0);
  return {
    items,
    totalIdr,
    note: "Prices are indicative starting prices in IDR. Open each tour to pick your date and travellers, then confirm and pay securely.",
  };
}

// ---------------------------------------------------------------------------
// The bounded agent loop
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are the Voyra Booking Agent for Bali travel. You help the user assemble a real, bookable plan.

HOW YOU WORK
- Use search_tours to find real tours before recommending anything. Never invent tours or prices.
- When the user wants to proceed, call build_draft_cart with the chosen tour slugs to produce a priced draft.
- A draft is NOT a booking. Always tell the user they review and pay themselves — you never charge anyone.
- Be concise, warm, and specific. Prices are in Indonesian Rupiah (IDR).
- If nothing matches, say so honestly and suggest a different search.

SAFETY
- Never claim a booking is confirmed, paid, or held.
- Never state a price you did not get from a tool.`;

interface ChatMsg {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
}

export async function runAgent(
  userId: number,
  userMessage: string,
  history: Array<{ role: "user" | "assistant"; content: string }>
): Promise<AgentResult> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const messages: ChatMsg[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(-8).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  const toolsUsed: string[] = [];
  let draft: DraftCart | null = null;
  let tokensIn = 0;
  let tokensOut = 0;

  for (let hop = 0; hop < MAX_HOPS; hop++) {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 700,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: messages as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: TOOLS as any,
      tool_choice: "auto",
    });

    tokensIn += completion.usage?.prompt_tokens ?? 0;
    tokensOut += completion.usage?.completion_tokens ?? 0;

    const choice = completion.choices[0]?.message;
    const toolCalls = choice?.tool_calls ?? [];

    // No tool calls → final answer.
    if (!toolCalls.length) {
      return {
        reply: choice?.content?.trim() || "I couldn't put that together — try rephrasing.",
        draft,
        toolsUsed,
        tokensIn,
        tokensOut,
      };
    }

    // Record the assistant's tool-call turn.
    messages.push({
      role: "assistant",
      content: choice?.content ?? "",
      tool_calls: toolCalls.map((tc) => ({
        id: tc.id,
        type: "function",
        function: { name: tc.function.name, arguments: tc.function.arguments },
      })),
    });

    // Execute each requested tool and append its result.
    for (const tc of toolCalls) {
      const name = tc.function.name;
      toolsUsed.push(name);
      let result: unknown = { error: "unknown tool" };
      try {
        const args = JSON.parse(tc.function.arguments || "{}");
        if (name === "search_tours") {
          result = { tours: await searchTours(String(args.query ?? "")) };
        } else if (name === "get_my_trips") {
          result = await getMyTrips(userId);
        } else if (name === "build_draft_cart") {
          const slugs = Array.isArray(args.slugs) ? args.slugs.map(String) : [];
          draft = await buildDraftCart(slugs);
          result = draft;
        }
      } catch (e) {
        result = { error: e instanceof Error ? e.message : "tool failed" };
      }
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(result).slice(0, 4000),
      });
    }
  }

  // Hop budget exhausted — return a graceful summary + whatever draft we built.
  return {
    reply:
      draft && draft.items.length > 0
        ? "Here's a draft of your plan. Review each tour, pick your dates, and confirm to book."
        : "I gathered some options but ran out of steps — ask me to narrow it down.",
    draft,
    toolsUsed,
    tokensIn,
    tokensOut,
  };
}
