/**
 * Signup fingerprint capture — anti-fraud signal for the welcome grant + per-
 * booking referral payout. Hashes IP, user-agent, and (when present) phone
 * with a salt so we can detect "same person, multiple emails" patterns
 * without storing PII in plaintext.
 */

import crypto from "crypto";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const SALT =
  process.env.SIGNUP_FINGERPRINT_SALT ??
  process.env.AI_GUEST_HASH_SALT ??
  process.env.NEXTAUTH_SECRET ??
  "voyra-fallback";

function hash(value: string): string {
  return crypto.createHash("sha256").update(`${value}|${SALT}`).digest("hex").slice(0, 32);
}

function extractIp(req: NextRequest | Request): string | null {
  const headers = req.headers;
  const cf = headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return null;
}

function extractUa(req: NextRequest | Request): string | null {
  return req.headers.get("user-agent") ?? null;
}

function normalisePhone(phone: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.length < 6) return null;
  return cleaned;
}

/**
 * Idempotent: writes a SignupFingerprint row for the user if missing.
 * Safe to call from register flow + Google signIn.
 */
export async function recordSignupFingerprint(params: {
  userId: number;
  req?: NextRequest | Request;
  phone?: string | null;
}): Promise<void> {
  try {
    const existing = await prisma.signupFingerprint.findUnique({
      where: { userId: params.userId },
    });
    if (existing) return;

    const ip = params.req ? extractIp(params.req) : null;
    const ua = params.req ? extractUa(params.req) : null;
    const phone = normalisePhone(params.phone ?? null);

    await prisma.signupFingerprint.create({
      data: {
        userId: params.userId,
        ipHash: ip ? hash(ip) : null,
        uaHash: ua ? hash(ua) : null,
        phoneHash: phone ? hash(phone) : null,
      },
    });
  } catch (e) {
    // Anti-fraud signal is best-effort; never block a signup on it.
    console.error("[Fingerprint] failed to record:", e instanceof Error ? e.message : e);
  }
}

/**
 * Quick lookup: how many distinct users share a phoneHash? Used by the admin
 * abuse panel and (optionally) the welcome-grant gate.
 */
export async function countUsersByPhoneHash(phoneHash: string): Promise<number> {
  return prisma.signupFingerprint.count({ where: { phoneHash } });
}

/**
 * Same-IP check: returns the request IP hashed (or null if no IP detectable).
 * Used by register flow to gate referral attribution if invitee shares IP
 * with the inviter at signup time.
 */
export function hashRequestIp(req: NextRequest | Request): string | null {
  const ip = extractIp(req);
  return ip ? hash(ip) : null;
}

export async function getUserIpHash(userId: number): Promise<string | null> {
  const fp = await prisma.signupFingerprint.findUnique({
    where: { userId },
    select: { ipHash: true },
  });
  return fp?.ipHash ?? null;
}

export const __internal = { hash, normalisePhone };
