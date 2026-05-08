import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import { verifyTotpForUser } from "@/lib/services/twoFactorService";
import { recordAudit } from "@/lib/services/auditLogService";
import { sendTwoFactorDisabledEmail } from "@/lib/email";

/**
 * Self-disable 2FA. Requires password + current TOTP code. Wipes secret,
 * deletes backup codes + trusted devices, bumps epoch.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);

  const body = await req.json().catch(() => ({}));
  const password = String(body?.password || "");
  const code = String(body?.code || "");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true, email: true, name: true, twoFactorEnabled: true, twoFactorEpoch: true },
  });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.twoFactorEnabled) return NextResponse.json({ ok: true });

  if (!user.password || !(await bcrypt.compare(password, user.password))) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const ok = await verifyTotpForUser(userId, code);
  if (!ok) return NextResponse.json({ error: "Invalid code" }, { status: 401 });

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorEnrolledAt: null,
        twoFactorMethod: null,
        twoFactorEpoch: { increment: 1 },
        totpLastWindow: null,
      },
    }),
    prisma.twoFactorBackupCode.deleteMany({ where: { userId } }),
    prisma.trustedDevice.deleteMany({ where: { userId } }),
    prisma.twoFactorChallenge.deleteMany({ where: { userId } }),
  ]);

  void recordAudit({ event: "2FA_DISABLED", actorId: userId, targetId: userId, req });

  void sendTwoFactorDisabledEmail({ to: user.email, name: user.name || "" }).catch((e) =>
    console.error("[2FA] disabled email failed:", e instanceof Error ? e.message : e)
  );

  return NextResponse.json({ ok: true });
}
