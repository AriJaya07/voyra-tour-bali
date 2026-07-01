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
import { runAgent } from "@/lib/services/aiToolRuntime";

/**
 * Voyra Booking Agent (Feature 1) — advisory → actionable.
 *
 * A bounded, tool-using agent that assembles a priced DRAFT cart the user
 * reviews and pays for through the normal checkout. It never charges money or
 * writes a booking. 5 credits/turn (token-aware settlement).
 */

const MODEL = "llama-3.3-70b-versatile";

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let reservationId: number | null = null;
  const ENDPOINT = "agent" as const;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const body = await req.json().catch(() => ({}));
    const userMessage = typeof body?.userMessage === "string" ? body.userMessage.trim() : "";
    const history = Array.isArray(body?.messages)
      ? body.messages
          .filter(
            (m: unknown): m is { role: "user" | "assistant"; content: string } =>
              typeof m === "object" &&
              m !== null &&
              (( m as { role: unknown }).role === "user" || (m as { role: unknown }).role === "assistant") &&
              typeof (m as { content: unknown }).content === "string"
          )
          .slice(-8)
      : [];

    if (!userMessage) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    await ensureFreeMonthlyGrant(userId).catch(() => {});

    const reserved = await reserveCredits(userId, ENDPOINT, AI_ENDPOINT_COST.agent);
    if (!reserved.ok) {
      return NextResponse.json(
        { error: "Out of AI credits", reason: reserved.reason, balance: reserved.remainingBalance, upgradeUrl: "/ai/pricing" },
        { status: 402 }
      );
    }
    reservationId = reserved.reservationId ?? null;

    const result = await runAgent(userId, userMessage, history);

    const durationMs = Date.now() - startedAt;
    const actualCost = Math.max(AI_ENDPOINT_COST.agent, settledChatCost(result.tokensIn, result.tokensOut));
    if (reservationId !== null) {
      await settleReservation(reservationId, actualCost, {
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        durationMs,
      }).catch(() => {});
    }
    await prisma.aiUsage
      .create({
        data: {
          userId,
          endpoint: ENDPOINT,
          creditsCost: actualCost,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut,
          durationMs,
          model: MODEL,
          status: "OK",
          meta: { toolsUsed: result.toolsUsed, hasDraft: !!result.draft },
        },
      })
      .catch(() => {});

    return NextResponse.json({ reply: result.reply, draft: result.draft });
  } catch (error) {
    if (reservationId !== null) await cancelReservation(reservationId).catch(() => {});
    console.error("[ai/agent]", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json({ error: "Booking agent unavailable" }, { status: 500 });
  }
}
