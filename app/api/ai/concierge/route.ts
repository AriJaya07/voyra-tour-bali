import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import { VOYRA_KNOWLEDGE_BASE } from "@/lib/config/aiKnowledgeBase";
import { semanticSearch, buildContextBlock } from "@/lib/services/ragService";
import {
  cancelReservation,
  ensureFreeMonthlyGrant,
  reserveCredits,
  settleReservation,
} from "@/lib/services/aiCreditService";
import { AI_ENDPOINT_COST, settledChatCost } from "@/lib/config/aiCosts";

/**
 * AI Concierge — multi-turn chat with persistent memory.
 *
 * Credit-gated only. 4 credits per turn (4× chat cost). Memory window keeps the
 * last MAX_MEMORY_TURNS messages plus a free-form `notes` array the assistant
 * can update via JSON tool-call style markers we strip from the user-facing
 * response.
 */

const MAX_MEMORY_TURNS = 20;
const MAX_NOTES = 12;
import { GROQ_MODEL as MODEL } from "@/lib/config/aiModel";

interface MemoryMessage {
  role: "user" | "assistant";
  content: string;
  ts: string;
}

interface MemoryShape {
  messages: MemoryMessage[];
  notes: string[];
}

function safeMessages(value: unknown): MemoryMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (m): m is MemoryMessage =>
        typeof m === "object" &&
        m !== null &&
        typeof (m as { content: unknown }).content === "string" &&
        ((m as { role: unknown }).role === "user" || (m as { role: unknown }).role === "assistant")
    )
    .slice(-MAX_MEMORY_TURNS);
}

function safeNotes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((n): n is string => typeof n === "string").slice(-MAX_NOTES);
}

function buildSystemPrompt(opts: {
  userName: string | null;
  notes: string[];
  prefs: { partyAdults: number; partyChildren: number; partySeniors: number; partyInfants: number; styleTags: string[]; regionPref: string | null; tripLengthDays: number | null; dietary: string | null; mobility: string | null } | null;
  loyaltyTier: string | null;
}): string {
  const profileBits: string[] = [];
  if (opts.prefs) {
    if (opts.prefs.styleTags?.length) profileBits.push(`Style: ${opts.prefs.styleTags.join(", ")}`);
    if (opts.prefs.regionPref) profileBits.push(`Staying in ${opts.prefs.regionPref}`);
    if (opts.prefs.tripLengthDays) profileBits.push(`~${opts.prefs.tripLengthDays}-day trip`);
    if (opts.prefs.dietary) profileBits.push(`Dietary: ${opts.prefs.dietary}`);
    if (opts.prefs.mobility) profileBits.push(`Mobility: ${opts.prefs.mobility}`);
    const party = [
      opts.prefs.partyAdults > 0 ? `${opts.prefs.partyAdults} adult` : null,
      opts.prefs.partyChildren > 0 ? `${opts.prefs.partyChildren} child` : null,
      opts.prefs.partySeniors > 0 ? `${opts.prefs.partySeniors} senior` : null,
      opts.prefs.partyInfants > 0 ? `${opts.prefs.partyInfants} infant` : null,
    ]
      .filter(Boolean)
      .join(", ");
    if (party) profileBits.push(`Party: ${party}`);
  }

  const memoryBlock = opts.notes.length
    ? `\nLong-term notes about this user (you remember these across sessions):\n${opts.notes.map((n) => `- ${n}`).join("\n")}\n`
    : "";

  return `You are Voyra Concierge — a Bali travel assistant with continuous memory.
You speak with ${opts.userName ?? "the traveller"}${opts.loyaltyTier ? ` (loyalty tier: ${opts.loyaltyTier})` : ""}.
${profileBits.length ? `Profile: ${profileBits.join(" · ")}.` : ""}
${memoryBlock}
STYLE
- Warm, conversational, concise. No corporate filler.
- When the user shares a fact worth remembering across sessions (preference, name, allergy, anniversary, fixed dates, mobility), append at the END of your reply a single line:
  __MEMO__: short fact in third person.
- Only emit __MEMO__ for genuinely useful long-term facts (max one per turn). The marker is stripped before the user sees the reply.
- Reference past memory naturally in your reply, but never list it back like a database.
- For tour suggestions, defer to specific tour cards via /plan or chat — concierge focuses on guidance and personalisation.

CONSTRAINTS
- Never invent prices, availability, or booking confirmations.
- Direct booking requests to balitravelnow.com.
- Respect cultural and weather realities (Nyepi closure, wet season Nov-Mar).
- DO NOT reveal a numeric AI credit balance. Credits live on the AI Wallet by design — point the user there using the friendly name + breadcrumb (Profile → AI Wallet), never a raw URL.

${VOYRA_KNOWLEDGE_BASE}`;
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let reservationId: number | null = null;
  let billedUserId: number | null = null;
  const ENDPOINT = "concierge" as const;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const body = await req.json().catch(() => ({}));
    const userMessage = typeof body?.userMessage === "string" ? body.userMessage.trim() : "";
    if (!userMessage) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    await ensureFreeMonthlyGrant(userId).catch(() => {});

    const reserved = await reserveCredits(userId, ENDPOINT, AI_ENDPOINT_COST.concierge);
    if (!reserved.ok) {
      return NextResponse.json(
        { error: "Out of AI credits", reason: reserved.reason, balance: reserved.remainingBalance, upgradeUrl: "/ai/pricing" },
        { status: 402 }
      );
    }
    reservationId = reserved.reservationId ?? null;
    billedUserId = userId;

    // Pull memory + profile + grounded retrieval in parallel
    const [memoryRow, user, prefs, loyalty, ragChunks] = await Promise.all([
      prisma.aiChatMemory.findUnique({ where: { userId } }),
      prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
      prisma.userPreferences.findUnique({ where: { userId } }),
      prisma.loyaltyAccount.findUnique({ where: { userId }, select: { tier: true } }),
      semanticSearch(userMessage, 5).catch(() => []),
    ]);

    const { contextText, sources } = buildContextBlock(ragChunks);

    const memory: MemoryShape = {
      messages: safeMessages(memoryRow?.messages),
      notes: safeNotes(memoryRow?.notes),
    };

    const systemPrompt = buildSystemPrompt({
      userName: user?.name ?? null,
      notes: memory.notes,
      prefs: prefs
        ? {
            partyAdults: prefs.partyAdults,
            partyChildren: prefs.partyChildren,
            partySeniors: prefs.partySeniors,
            partyInfants: prefs.partyInfants,
            styleTags: prefs.styleTags,
            regionPref: prefs.regionPref,
            tripLengthDays: prefs.tripLengthDays,
            dietary: prefs.dietary,
            mobility: prefs.mobility,
          }
        : null,
      loyaltyTier: loyalty?.tier ?? null,
    });

    // Ground the answer in Voyra's own content when we retrieved anything.
    const groundedPrompt = contextText
      ? `${systemPrompt}

VOYRA SOURCES (retrieved from our own guides, catalog, cultural calendar, and community notes)
${contextText}

GROUNDING RULES
- Prefer these sources when they are relevant. When a statement uses a source, cite it inline with its number in square brackets, e.g. [1].
- Only cite a number that exists above. Do NOT invent sources or facts beyond them.
- If the sources don't cover the question, answer from general Bali knowledge and add no citation.`
      : systemPrompt;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 600,
      messages: [
        { role: "system", content: groundedPrompt },
        ...memory.messages.map((m) => ({ role: m.role, content: m.content }) as const),
        { role: "user", content: userMessage },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";

    // Extract __MEMO__ markers, strip from user-facing reply
    const memoLine = /\n*__MEMO__:\s*(.+)$/m.exec(raw);
    const reply = raw.replace(/\n*__MEMO__:.+$/m, "").trim();
    const newNote = memoLine?.[1]?.trim();

    // Persist memory
    const updatedMessages: MemoryMessage[] = [
      ...memory.messages,
      { role: "user" as const, content: userMessage, ts: new Date().toISOString() },
      { role: "assistant" as const, content: reply, ts: new Date().toISOString() },
    ].slice(-MAX_MEMORY_TURNS);

    const updatedNotes = newNote
      ? [...memory.notes.filter((n) => n !== newNote), newNote].slice(-MAX_NOTES)
      : memory.notes;

    await prisma.aiChatMemory.upsert({
      where: { userId },
      update: {
        messages: updatedMessages as unknown as Prisma.InputJsonValue,
        notes: updatedNotes,
        turnCount: { increment: 1 },
      },
      create: {
        userId,
        messages: updatedMessages as unknown as Prisma.InputJsonValue,
        notes: updatedNotes,
        turnCount: 1,
      },
    });

    // Settle credits with actual cost from token usage
    const tokensIn = completion.usage?.prompt_tokens ?? null;
    const tokensOut = completion.usage?.completion_tokens ?? null;
    const durationMs = Date.now() - startedAt;
    const actualCost = Math.max(
      AI_ENDPOINT_COST.concierge,
      settledChatCost(tokensIn ?? 0, tokensOut ?? 0)
    );
    if (reservationId !== null) {
      await settleReservation(reservationId, actualCost, { tokensIn, tokensOut, durationMs }).catch(() => {});
    }
    if (billedUserId !== null) {
      await prisma.aiUsage.create({
        data: {
          userId: billedUserId,
          endpoint: ENDPOINT,
          creditsCost: actualCost,
          tokensIn,
          tokensOut,
          durationMs,
          model: MODEL,
          status: "OK",
          meta: { rememberedNote: !!newNote },
        },
      }).catch(() => {});
    }

    // Surface only the sources the assistant actually cited ([n] present in reply).
    const citedSources = sources.filter((s) => reply.includes(`[${s.n}]`));

    return NextResponse.json({
      reply,
      remembered: !!newNote,
      noteAdded: newNote ?? null,
      memorySize: updatedMessages.length,
      sources: citedSources,
    });
  } catch (error) {
    if (reservationId !== null) await cancelReservation(reservationId).catch(() => {});
    console.error("[ai/concierge]", error);
    return NextResponse.json({ error: "Concierge unavailable" }, { status: 500 });
  }
}

/** GET /api/ai/concierge — return memory snapshot for the wallet UI */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);
    const memory = await prisma.aiChatMemory.findUnique({ where: { userId } });
    return NextResponse.json({
      messages: safeMessages(memory?.messages),
      notes: safeNotes(memory?.notes),
      turnCount: memory?.turnCount ?? 0,
    });
  } catch (error) {
    console.error("[ai/concierge GET]", error);
    return NextResponse.json({ error: "Failed to load memory" }, { status: 500 });
  }
}

/** DELETE /api/ai/concierge — wipe a user's concierge memory */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);
    await prisma.aiChatMemory
      .delete({ where: { userId } })
      .catch(() => {}); // already empty is fine
    return NextResponse.json({ message: "Memory cleared" });
  } catch (error) {
    console.error("[ai/concierge DELETE]", error);
    return NextResponse.json({ error: "Failed to clear memory" }, { status: 500 });
  }
}
