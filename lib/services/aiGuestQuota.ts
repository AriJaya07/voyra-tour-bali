/**
 * Guest AI quota — IP-based rate limit for unauthenticated users.
 *
 * Backed by the AiUsage table (reused for analytics). One OK row per consumed
 * call; DENIED_QUOTA rows logged for abuse detection. No reservation: guests
 * never get partial refunds.
 */

import crypto from "crypto";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AI_CREDIT_GUARD_ON,
  AI_GUEST_DAILY_LIMIT,
  AI_GUEST_WINDOW_MS,
  type AiEndpoint,
} from "@/lib/config/aiCosts";

const SALT = process.env.AI_GUEST_HASH_SALT ?? process.env.NEXTAUTH_SECRET ?? "voyra-fallback";

export function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(`${ip}|${SALT}`).digest("hex").slice(0, 32);
}

export function extractIp(req: NextRequest | Request): string {
  const headers = req.headers;
  const cf = headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export interface GuestConsumeResult {
  ok: boolean;
  used: number;
  limit: number;
  ipHash: string;
}

/**
 * Consume one guest call. Returns ok=false if over the rolling daily limit.
 * Caller should still log AiUsage on actual LLM result with status=OK or ERROR.
 */
export async function consumeGuest(
  req: NextRequest | Request,
  endpoint: AiEndpoint
): Promise<GuestConsumeResult> {
  const ip = extractIp(req);
  const ipHash = hashIp(ip);

  if (!AI_CREDIT_GUARD_ON) {
    return { ok: true, used: 0, limit: AI_GUEST_DAILY_LIMIT, ipHash };
  }

  const since = new Date(Date.now() - AI_GUEST_WINDOW_MS);
  const used = await prisma.aiUsage.count({
    where: {
      ipHash,
      userId: null,
      status: "OK",
      createdAt: { gte: since },
    },
  });

  if (used >= AI_GUEST_DAILY_LIMIT) {
    await prisma.aiUsage.create({
      data: {
        ipHash,
        endpoint,
        creditsCost: 0,
        status: "DENIED_QUOTA",
        meta: { limit: AI_GUEST_DAILY_LIMIT, window: AI_GUEST_WINDOW_MS },
      },
    });
    return { ok: false, used, limit: AI_GUEST_DAILY_LIMIT, ipHash };
  }

  return { ok: true, used, limit: AI_GUEST_DAILY_LIMIT, ipHash };
}

/** Log a successful guest call. Call after LLM returns OK. */
export async function logGuestUsage(params: {
  ipHash: string;
  endpoint: AiEndpoint;
  tokensIn?: number;
  tokensOut?: number;
  durationMs?: number;
  model?: string;
  status?: "OK" | "ERROR";
}): Promise<void> {
  await prisma.aiUsage.create({
    data: {
      ipHash: params.ipHash,
      endpoint: params.endpoint,
      creditsCost: 0,
      tokensIn: params.tokensIn ?? null,
      tokensOut: params.tokensOut ?? null,
      durationMs: params.durationMs ?? null,
      model: params.model ?? null,
      status: params.status ?? "OK",
    },
  });
}
