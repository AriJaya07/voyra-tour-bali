import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { verifyTurnstile } from "@/utils/verifyTurnstile";
import { createChallenge, TRUSTED_DEVICE_COOKIE, hashTrustedDeviceToken } from "@/lib/services/twoFactorService";
import { hashIp, hashUa, recordAudit } from "@/lib/services/auditLogService";

const MAX_ATTEMPTS = 3;
const LOCK_MS = 60 * 1000;

/**
 * Login preflight. Validates email + password + captcha. Returns whether
 * MFA is needed. Does NOT issue session — that happens after the client
 * resubmits to NextAuth credentials with `mfaToken`.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || "").toLowerCase().trim();
  const password = String(body?.password || "");
  const captchaToken = String(body?.captchaToken || "");

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const captchaOk = await verifyTurnstile(captchaToken);
  if (!captchaOk) {
    void recordAudit({ event: "LOGIN_CAPTCHA_FAIL", req, meta: { email } });
    return NextResponse.json({ error: "Captcha verification failed" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password) {
    // Avoid user-enumeration. Same response for "no user" and "no password".
    void recordAudit({ event: "LOGIN_FAIL", req, meta: { email, reason: "UNKNOWN_USER" } });
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  if (user.loginLockedUntil && user.loginLockedUntil > new Date()) {
    const remainingSeconds = Math.ceil(
      (user.loginLockedUntil.getTime() - Date.now()) / 1000
    );
    void recordAudit({
      event: "LOGIN_LOCKED",
      targetId: user.id,
      req,
      meta: { remainingSeconds },
    });
    return NextResponse.json(
      { error: `LOCKED:${remainingSeconds}`, remainingSeconds },
      { status: 423 }
    );
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    const newAttempts = user.loginAttempts + 1;
    if (newAttempts >= MAX_ATTEMPTS) {
      await prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: newAttempts, loginLockedUntil: new Date(Date.now() + LOCK_MS) },
      });
      void recordAudit({
        event: "LOGIN_LOCKED",
        targetId: user.id,
        req,
        meta: { reason: "MAX_ATTEMPTS", attempts: newAttempts },
      });
      return NextResponse.json({ error: "LOCKED:60", remainingSeconds: 60 }, { status: 423 });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: newAttempts },
    });
    void recordAudit({
      event: "LOGIN_FAIL",
      targetId: user.id,
      req,
      meta: { reason: "BAD_PASSWORD", attempts: newAttempts },
    });
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  if (!user.emailVerified && user.role === "USER") {
    void recordAudit({ event: "LOGIN_EMAIL_UNVERIFIED", targetId: user.id, req });
    return NextResponse.json({ error: "Please verify your email before signing in." }, { status: 403 });
  }

  // No 2FA — client may proceed straight to NextAuth signIn.
  if (!user.twoFactorEnabled) {
    void recordAudit({ event: "LOGIN_OK", targetId: user.id, req, meta: { mfa: false } });
    return NextResponse.json({ needsMfa: false });
  }

  // Trusted-device shortcut: if cookie present + valid + epoch matches,
  // skip MFA and signal to caller.
  const td = req.cookies.get(TRUSTED_DEVICE_COOKIE)?.value || "";
  if (td && td.length >= 32) {
    const tokenHash = hashTrustedDeviceToken(td);
    const dev = await prisma.trustedDevice.findUnique({ where: { tokenHash } });
    if (
      dev &&
      dev.userId === user.id &&
      dev.twoFactorEpoch === user.twoFactorEpoch &&
      dev.expiresAt.getTime() > Date.now()
    ) {
      void recordAudit({
        event: "LOGIN_OK",
        targetId: user.id,
        req,
        meta: { mfa: false, trustedDevice: true },
      });
      return NextResponse.json({
        needsMfa: false,
        trustedDevice: true,
        trustedDeviceToken: td,
      });
    }
  }

  const challenge = await createChallenge({
    userId: user.id,
    purpose: "LOGIN",
    method: "TOTP",
    ipHash: hashIp(req),
    uaHash: hashUa(req),
  });

  // Compute the methods the user can pick from
  const backupAvailable =
    (await prisma.twoFactorBackupCode.count({
      where: { userId: user.id, usedAt: null },
    })) > 0;

  return NextResponse.json({
    needsMfa: true,
    challengeId: challenge.id,
    methods: ["TOTP", ...(backupAvailable ? ["BACKUP"] : []), "EMAIL_OTP"],
    expiresAt: challenge.expiresAt.toISOString(),
    // Echo a short-lived challenge cookie marker so the verify endpoint can
    // double-check origin (purely defensive — main check is challengeId).
    nonce: crypto.randomBytes(8).toString("hex"),
  });
}
