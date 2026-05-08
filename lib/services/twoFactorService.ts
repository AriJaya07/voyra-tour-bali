/**
 * Two-Factor Authentication service.
 *
 * Single chokepoint for TOTP enrollment, code verification, backup codes,
 * email-OTP fallback, and login challenge lifecycle. Secrets stored AES-256-GCM
 * encrypted at rest. Backup codes bcrypt-hashed, single-use.
 */

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import { prisma } from "@/lib/prisma";
import { SITE_NAME } from "@/lib/config";

const KEY_HEX =
  process.env.TWO_FACTOR_ENCRYPTION_KEY ??
  process.env.NEXTAUTH_SECRET ??
  "";

function getKey(): Buffer {
  if (!KEY_HEX) {
    throw new Error("TWO_FACTOR_ENCRYPTION_KEY (or NEXTAUTH_SECRET) must be set");
  }
  // Accept hex (64 chars) or any string — derive 32 bytes via sha256 fallback.
  const buf =
    KEY_HEX.length === 64 && /^[0-9a-fA-F]+$/.test(KEY_HEX)
      ? Buffer.from(KEY_HEX, "hex")
      : crypto.createHash("sha256").update(KEY_HEX).digest();
  return buf;
}

// ── Encryption ────────────────────────────────────────────────────────────

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${enc.toString("base64")}.${tag.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const parts = payload.split(".");
  if (parts.length !== 3) throw new Error("Invalid encrypted secret");
  const [ivB64, encB64, tagB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const enc = Buffer.from(encB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}

// ── TOTP ──────────────────────────────────────────────────────────────────

authenticator.options = {
  window: 1, // ±30s tolerance
  step: 30,
  digits: 6,
};

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function buildOtpauthUrl(secret: string, email: string): string {
  return authenticator.keyuri(email, SITE_NAME || "Voyra", secret);
}

/**
 * Verify a TOTP code AND guard replay (reject if same step counter already used).
 * Updates `User.totpLastWindow` on success.
 * Pass `skipReplayGuard=true` for ENROLL_VERIFY (no persisted state yet).
 */
export async function verifyTotpForUser(
  userId: number,
  code: string,
  opts?: { skipReplayGuard?: boolean }
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true, totpLastWindow: true },
  });
  if (!user?.twoFactorSecret) return false;
  return verifyTotpRaw({
    encryptedSecret: user.twoFactorSecret,
    code,
    lastWindow: opts?.skipReplayGuard ? null : (user.totpLastWindow ? Number(user.totpLastWindow) : null),
    onAccept: async (window) => {
      if (opts?.skipReplayGuard) return;
      await prisma.user.update({
        where: { id: userId },
        data: { totpLastWindow: BigInt(window) },
      });
    },
  });
}

export async function verifyTotpRaw(params: {
  encryptedSecret: string;
  code: string;
  lastWindow: number | null;
  onAccept?: (window: number) => Promise<void>;
}): Promise<boolean> {
  let secret: string;
  try {
    secret = decryptSecret(params.encryptedSecret);
  } catch {
    return false;
  }
  const cleaned = (params.code || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleaned)) return false;

  const ok = authenticator.check(cleaned, secret);
  if (!ok) return false;

  const window = Math.floor(Date.now() / 1000 / authenticator.options.step!);
  if (params.lastWindow !== null && window <= params.lastWindow) {
    return false; // replay
  }
  if (params.onAccept) await params.onAccept(window);
  return true;
}

// ── Backup codes ──────────────────────────────────────────────────────────

const BACKUP_CODE_GROUPS = 2;
const BACKUP_CODE_GROUP_LEN = 5;

function randomBackupCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const groups: string[] = [];
  for (let g = 0; g < BACKUP_CODE_GROUPS; g++) {
    let chunk = "";
    for (let i = 0; i < BACKUP_CODE_GROUP_LEN; i++) {
      chunk += alphabet[crypto.randomInt(0, alphabet.length)];
    }
    groups.push(chunk);
  }
  return groups.join("-");
}

/**
 * Generate 10 backup codes, persist bcrypt hashes, return PLAINTEXT codes once.
 * Caller MUST display + ask user to store; codes can never be retrieved again.
 */
export async function generateBackupCodes(userId: number, count = 10): Promise<string[]> {
  const codes: string[] = [];
  const data: { userId: number; codeHash: string }[] = [];
  for (let i = 0; i < count; i++) {
    const code = randomBackupCode();
    codes.push(code);
    data.push({ userId, codeHash: await bcrypt.hash(code, 10) });
  }
  await prisma.$transaction([
    prisma.twoFactorBackupCode.deleteMany({ where: { userId } }),
    prisma.twoFactorBackupCode.createMany({ data }),
  ]);
  return codes;
}

export async function consumeBackupCode(userId: number, code: string): Promise<boolean> {
  const cleaned = (code || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z0-9]{5}-?[A-Z0-9]{5}$/.test(cleaned)) return false;
  const normalized = cleaned.length === 10 ? `${cleaned.slice(0, 5)}-${cleaned.slice(5)}` : cleaned;

  const open = await prisma.twoFactorBackupCode.findMany({
    where: { userId, usedAt: null },
  });
  for (const row of open) {
    if (await bcrypt.compare(normalized, row.codeHash)) {
      await prisma.twoFactorBackupCode.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      });
      return true;
    }
  }
  return false;
}

export async function countRemainingBackupCodes(userId: number): Promise<number> {
  return prisma.twoFactorBackupCode.count({ where: { userId, usedAt: null } });
}

// ── Challenges ────────────────────────────────────────────────────────────

export const CHALLENGE_TTL_MS = 10 * 60 * 1000; // 10 min
export const CHALLENGE_MAX_ATTEMPTS = 5;
export const EMAIL_OTP_TTL_MS = 10 * 60 * 1000;
export const EMAIL_OTP_MAX_SENDS = 3;
export const MFA_TOKEN_TTL_MS = 60 * 1000; // 60 sec — exchanged immediately by NextAuth

export type ChallengePurpose = "LOGIN" | "STEP_UP" | "ENROLL_VERIFY";
export type ChallengeMethod = "TOTP" | "EMAIL_OTP" | "BACKUP";

export async function createChallenge(params: {
  userId: number;
  purpose: ChallengePurpose;
  method: ChallengeMethod;
  ipHash?: string | null;
  uaHash?: string | null;
}): Promise<{ id: number; expiresAt: Date }> {
  const challenge = await prisma.twoFactorChallenge.create({
    data: {
      userId: params.userId,
      purpose: params.purpose,
      method: params.method,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
      ipHash: params.ipHash ?? null,
      uaHash: params.uaHash ?? null,
    },
  });
  return { id: challenge.id, expiresAt: challenge.expiresAt };
}

export function generateEmailOtp(): string {
  // 6-digit numeric, leading-zero safe
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function setEmailOtpOnChallenge(challengeId: number, code: string): Promise<void> {
  const hash = await bcrypt.hash(code, 10);
  await prisma.twoFactorChallenge.update({
    where: { id: challengeId },
    data: {
      emailOtpHash: hash,
      emailSends: { increment: 1 },
      method: "EMAIL_OTP",
      expiresAt: new Date(Date.now() + EMAIL_OTP_TTL_MS),
    },
  });
}

/**
 * Verify a code against an open challenge. Returns the challenge id on success
 * with a fresh `mfaToken` (plaintext, returned ONCE) for NextAuth exchange.
 */
export async function verifyChallengeCode(params: {
  challengeId: number;
  code: string;
  expectedUserId?: number;
  expectedPurpose?: ChallengePurpose;
}): Promise<
  | { ok: true; mfaToken: string; userId: number; method: ChallengeMethod }
  | { ok: false; reason: "EXPIRED" | "EXHAUSTED" | "INVALID" | "WRONG_USER" | "ALREADY_VERIFIED" }
> {
  const challenge = await prisma.twoFactorChallenge.findUnique({
    where: { id: params.challengeId },
    include: { user: { select: { twoFactorSecret: true, totpLastWindow: true } } },
  });
  if (!challenge) return { ok: false, reason: "INVALID" };
  if (params.expectedUserId && challenge.userId !== params.expectedUserId)
    return { ok: false, reason: "WRONG_USER" };
  if (params.expectedPurpose && challenge.purpose !== params.expectedPurpose)
    return { ok: false, reason: "INVALID" };
  if (challenge.verified) return { ok: false, reason: "ALREADY_VERIFIED" };
  if (challenge.expiresAt.getTime() < Date.now()) return { ok: false, reason: "EXPIRED" };
  if (challenge.attempts >= CHALLENGE_MAX_ATTEMPTS) return { ok: false, reason: "EXHAUSTED" };

  let valid = false;

  if (challenge.method === "TOTP") {
    if (!challenge.user.twoFactorSecret) return { ok: false, reason: "INVALID" };
    valid = await verifyTotpRaw({
      encryptedSecret: challenge.user.twoFactorSecret,
      code: params.code,
      lastWindow: challenge.user.totpLastWindow ? Number(challenge.user.totpLastWindow) : null,
      onAccept: async (window) => {
        await prisma.user.update({
          where: { id: challenge.userId },
          data: { totpLastWindow: BigInt(window) },
        });
      },
    });
  } else if (challenge.method === "EMAIL_OTP") {
    if (!challenge.emailOtpHash) return { ok: false, reason: "INVALID" };
    const cleaned = (params.code || "").replace(/\s+/g, "");
    if (/^\d{6}$/.test(cleaned)) {
      valid = await bcrypt.compare(cleaned, challenge.emailOtpHash);
    }
  } else if (challenge.method === "BACKUP") {
    valid = await consumeBackupCode(challenge.userId, params.code);
  }

  if (!valid) {
    await prisma.twoFactorChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, reason: "INVALID" };
  }

  // Issue mfaToken — plaintext returned to caller, hash persisted.
  const plain = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(plain).digest("hex");

  await prisma.twoFactorChallenge.update({
    where: { id: challenge.id },
    data: {
      verified: true,
      mfaTokenHash: tokenHash,
      expiresAt: new Date(Date.now() + MFA_TOKEN_TTL_MS),
    },
  });

  return {
    ok: true,
    mfaToken: plain,
    userId: challenge.userId,
    method: challenge.method as ChallengeMethod,
  };
}

/**
 * Exchange & consume the mfaToken inside NextAuth `authorize()`. Single-use:
 * on success, marks the challenge consumed and returns userId.
 */
export async function consumeMfaToken(token: string, expectedUserId: number): Promise<boolean> {
  if (!token || token.length < 32) return false;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const ch = await prisma.twoFactorChallenge.findUnique({ where: { mfaTokenHash: tokenHash } });
  if (!ch) return false;
  if (ch.userId !== expectedUserId) return false;
  if (!ch.verified) return false;
  if (ch.consumedAt) return false;
  if (ch.expiresAt.getTime() < Date.now()) return false;
  if (ch.purpose !== "LOGIN") return false;

  await prisma.twoFactorChallenge.update({
    where: { id: ch.id },
    data: { consumedAt: new Date() },
  });
  return true;
}

/**
 * Step-up flow only: did the user pass a STEP_UP challenge in the last `freshnessMs`?
 */
export async function consumeStepUpToken(token: string, userId: number): Promise<boolean> {
  if (!token || token.length < 32) return false;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const ch = await prisma.twoFactorChallenge.findUnique({ where: { mfaTokenHash: tokenHash } });
  if (!ch) return false;
  if (ch.userId !== userId) return false;
  if (!ch.verified) return false;
  if (ch.consumedAt) return false;
  if (ch.purpose !== "STEP_UP") return false;
  if (ch.expiresAt.getTime() < Date.now()) return false;

  await prisma.twoFactorChallenge.update({
    where: { id: ch.id },
    data: { consumedAt: new Date() },
  });
  return true;
}

// ── Trusted device ────────────────────────────────────────────────────────

export const TRUSTED_DEVICE_TTL_DAYS = 30;
export const TRUSTED_DEVICE_COOKIE = "voyra_td";

export function generateTrustedDeviceToken(): { plain: string; hash: string } {
  const plain = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(plain).digest("hex");
  return { plain, hash };
}

export function hashTrustedDeviceToken(plain: string): string {
  return crypto.createHash("sha256").update(plain).digest("hex");
}
