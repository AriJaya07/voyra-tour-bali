/**
 * Audit log — single chokepoint for security/admin events.
 *
 * Caller passes the request to extract IP/UA which are hashed (never stored
 * plain). Best-effort: failures log to console but never throw.
 */

import crypto from "crypto";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export type AuditEvent =
  | "2FA_ENABLED"
  | "2FA_DISABLED"
  | "2FA_ADMIN_RESET"
  | "2FA_ADMIN_DISABLED"
  | "2FA_LOGIN_OK"
  | "2FA_LOGIN_FAIL"
  | "2FA_BACKUP_USED"
  | "2FA_EMAIL_OTP_SENT"
  | "2FA_BACKUP_CODES_REGEN"
  | "TRUSTED_DEVICE_ADDED"
  | "TRUSTED_DEVICE_REVOKED"
  | "TRUSTED_DEVICES_REVOKED_ALL"
  | "LOCKOUT_CLEARED"
  | "PASSWORD_CHANGED"
  | "ADMIN_USER_VIEW"
  | "ADMIN_FORCE_PASSWORD_RESET";

const SALT =
  process.env.SIGNUP_FINGERPRINT_SALT ??
  process.env.AI_GUEST_HASH_SALT ??
  process.env.NEXTAUTH_SECRET ??
  "voyra-fallback";

function hashValue(v: string): string {
  return crypto.createHash("sha256").update(`${v}|${SALT}`).digest("hex").slice(0, 32);
}

function extractIp(req: NextRequest | Request | null | undefined): string | null {
  if (!req) return null;
  const h = req.headers;
  const cf = h.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = h.get("x-real-ip");
  if (real) return real.trim();
  return null;
}

export function hashIp(req: NextRequest | Request | null | undefined): string | null {
  const ip = extractIp(req);
  return ip ? hashValue(ip) : null;
}

export function hashUa(req: NextRequest | Request | null | undefined): string | null {
  if (!req) return null;
  const ua = req.headers.get("user-agent");
  return ua ? hashValue(ua) : null;
}

export async function recordAudit(params: {
  event: AuditEvent;
  actorId?: number | null;
  targetId?: number | null;
  req?: NextRequest | Request | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        event: params.event,
        actorId: params.actorId ?? null,
        targetId: params.targetId ?? null,
        ipHash: hashIp(params.req),
        uaHash: hashUa(params.req),
        meta: (params.meta as object | undefined) ?? undefined,
      },
    });
  } catch (e) {
    console.error("[Audit] failed:", e instanceof Error ? e.message : e);
  }
}

/**
 * Recent failed-2FA-attempts count for a user in the last 24h. Used by login
 * to flip into "admin reset required" state after persistent abuse.
 */
export async function recentFailedMfaAttempts(userId: number): Promise<number> {
  return prisma.auditLog.count({
    where: {
      targetId: userId,
      event: "2FA_LOGIN_FAIL",
      createdAt: { gte: new Date(Date.now() - 86_400_000) },
    },
  });
}
