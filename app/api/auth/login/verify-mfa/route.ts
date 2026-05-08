import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyChallengeCode,
  generateTrustedDeviceToken,
  TRUSTED_DEVICE_COOKIE,
  TRUSTED_DEVICE_TTL_DAYS,
} from "@/lib/services/twoFactorService";
import { hashIp, hashUa, recordAudit } from "@/lib/services/auditLogService";
import { sendTwoFactorBackupUsedEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const challengeId = Number(body?.challengeId);
  const code = String(body?.code || "");
  const trustDevice = Boolean(body?.trustDevice);
  const method = String(body?.method || "TOTP") as "TOTP" | "EMAIL_OTP" | "BACKUP";

  if (!challengeId || !code) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // For BACKUP/EMAIL_OTP we may need to flip the challenge.method to match user's choice.
  // (Preflight always creates as TOTP. EMAIL_OTP is set by the email-send endpoint.
  // BACKUP we set here.)
  if (method === "BACKUP") {
    await prisma.twoFactorChallenge
      .update({ where: { id: challengeId }, data: { method: "BACKUP" } })
      .catch(() => {});
  }

  const result = await verifyChallengeCode({
    challengeId,
    code,
    expectedPurpose: "LOGIN",
  });

  if (!result.ok) {
    if (result.reason === "INVALID") {
      const ch = await prisma.twoFactorChallenge.findUnique({ where: { id: challengeId } });
      if (ch?.userId) {
        void recordAudit({
          event: "2FA_LOGIN_FAIL",
          targetId: ch.userId,
          req,
          meta: { method, reason: "INVALID_CODE" },
        });
      }
    }
    const status = result.reason === "EXPIRED" ? 410 : result.reason === "EXHAUSTED" ? 429 : 401;
    return NextResponse.json({ error: result.reason }, { status });
  }

  // Optional trusted-device cookie
  let tdCookie: { plain: string; hash: string } | null = null;
  if (trustDevice) {
    tdCookie = generateTrustedDeviceToken();
    const user = await prisma.user.findUnique({
      where: { id: result.userId },
      select: { twoFactorEpoch: true },
    });
    await prisma.trustedDevice.create({
      data: {
        userId: result.userId,
        tokenHash: tdCookie.hash,
        twoFactorEpoch: user?.twoFactorEpoch ?? 0,
        expiresAt: new Date(Date.now() + TRUSTED_DEVICE_TTL_DAYS * 86_400_000),
        ipHash: hashIp(req),
        uaHash: hashUa(req),
      },
    });
    void recordAudit({
      event: "TRUSTED_DEVICE_ADDED",
      actorId: result.userId,
      targetId: result.userId,
      req,
    });
  }

  if (result.method === "BACKUP") {
    const remaining = await prisma.twoFactorBackupCode.count({
      where: { userId: result.userId, usedAt: null },
    });
    const user = await prisma.user.findUnique({
      where: { id: result.userId },
      select: { email: true, name: true },
    });
    if (user?.email) {
      void sendTwoFactorBackupUsedEmail({
        to: user.email,
        name: user.name || "",
        remaining,
      }).catch((e) => console.error("[2FA] backup email failed:", e));
    }
    void recordAudit({ event: "2FA_BACKUP_USED", targetId: result.userId, req });
  }

  void recordAudit({ event: "2FA_LOGIN_OK", targetId: result.userId, req, meta: { method: result.method } });

  const res = NextResponse.json({
    ok: true,
    mfaToken: result.mfaToken,
  });

  if (tdCookie) {
    res.cookies.set(TRUSTED_DEVICE_COOKIE, tdCookie.plain, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: TRUSTED_DEVICE_TTL_DAYS * 86_400,
      path: "/",
    });
  }

  return res;
}
