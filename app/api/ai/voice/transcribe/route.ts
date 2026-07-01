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
import { AI_ENDPOINT_COST } from "@/lib/config/aiCosts";

/**
 * Voice transcription (Feature 4) — speech → text for hands-free, in-trip use.
 *
 * Uses Groq's hosted Whisper (same provider as all other text AI — no new
 * vendor). Returns a transcript the client feeds into chat/concierge/agent
 * (which bill separately). 1 credit/transcription.
 */

const MODEL = "whisper-large-v3";
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let reservationId: number | null = null;
  const ENDPOINT = "voice" as const;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Audio file is required" }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Audio file too large or empty" }, { status: 400 });
    }

    await ensureFreeMonthlyGrant(userId).catch(() => {});
    const reserved = await reserveCredits(userId, ENDPOINT, AI_ENDPOINT_COST.voice);
    if (!reserved.ok) {
      return NextResponse.json(
        { error: "Out of AI credits", reason: reserved.reason, balance: reserved.remainingBalance, upgradeUrl: "/ai/pricing" },
        { status: 402 }
      );
    }
    reservationId = reserved.reservationId ?? null;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const transcription = await groq.audio.transcriptions.create({
      file,
      model: MODEL,
    });

    const text = (transcription.text ?? "").trim();
    const durationMs = Date.now() - startedAt;

    if (reservationId !== null) {
      await settleReservation(reservationId, AI_ENDPOINT_COST.voice, { durationMs }).catch(() => {});
    }
    await prisma.aiUsage
      .create({
        data: { userId, endpoint: ENDPOINT, creditsCost: AI_ENDPOINT_COST.voice, durationMs, model: MODEL, status: "OK" },
      })
      .catch(() => {});

    return NextResponse.json({ text });
  } catch (error) {
    if (reservationId !== null) await cancelReservation(reservationId).catch(() => {});
    console.error("[ai/voice/transcribe]", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json({ error: "Transcription unavailable" }, { status: 500 });
  }
}
