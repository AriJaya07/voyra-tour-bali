import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  EMAIL_OTP_MAX_SENDS,
  generateEmailOtp,
  setEmailOtpOnChallenge,
} from "@/lib/services/twoFactorService";
import { sendTwoFactorEmailOtp } from "@/lib/email";
import { hashIp, recordAudit } from "@/lib/services/auditLogService";

const SEND_COOLDOWN_MS = 60 * 1000;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const challengeId = Number(body?.challengeId);
  if (!challengeId) {
    return NextResponse.json({ error: "Missing challengeId" }, { status: 400 });
  }

  const ch = await prisma.twoFactorChallenge.findUnique({
    where: { id: challengeId },
    include: { user: { select: { email: true } } },
  });
  if (!ch) return NextResponse.json({ error: "Invalid challenge" }, { status: 404 });
  if (ch.purpose !== "LOGIN") return NextResponse.json({ error: "Invalid challenge" }, { status: 400 });
  if (ch.verified) return NextResponse.json({ error: "Already verified" }, { status: 400 });
  if (ch.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Challenge expired" }, { status: 410 });
  }
  if (ch.emailSends >= EMAIL_OTP_MAX_SENDS) {
    return NextResponse.json({ error: "Max sends reached" }, { status: 429 });
  }
  if (ch.method === "EMAIL_OTP" && ch.createdAt.getTime() > Date.now() - SEND_COOLDOWN_MS && ch.emailSends > 0) {
    // Cooldown — but allow first send
    return NextResponse.json({ error: "Wait before resending" }, { status: 429 });
  }

  const code = generateEmailOtp();
  await setEmailOtpOnChallenge(challengeId, code);

  if (ch.user.email) {
    const ipHash = hashIp(req);
    const ipDescription = ipHash ? `IP fingerprint ${ipHash.slice(0, 8)}` : undefined;
    try {
      await sendTwoFactorEmailOtp({ to: ch.user.email, code, ipDescription });
    } catch (e) {
      console.error("[2FA] email OTP send failed:", e instanceof Error ? e.message : e);
      return NextResponse.json({ error: "Email send failed" }, { status: 500 });
    }
  }

  await recordAudit({ event: "2FA_EMAIL_OTP_SENT", targetId: ch.userId, req });

  return NextResponse.json({ ok: true, sends: ch.emailSends + 1, max: EMAIL_OTP_MAX_SENDS });
}
