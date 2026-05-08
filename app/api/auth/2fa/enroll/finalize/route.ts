import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/services/auditLogService";
import { sendTwoFactorEnabledEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, twoFactorSecret: true, twoFactorEnabled: true },
  });
  if (!user?.twoFactorSecret) {
    return NextResponse.json({ error: "Run /enroll/verify first" }, { status: 400 });
  }
  if (user.twoFactorEnabled) {
    return NextResponse.json({ ok: true });
  }

  const codeCount = await prisma.twoFactorBackupCode.count({ where: { userId, usedAt: null } });
  if (codeCount === 0) {
    return NextResponse.json({ error: "Generate backup codes first" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: true,
      twoFactorEnrolledAt: new Date(),
      twoFactorMethod: "TOTP",
    },
  });

  void recordAudit({ event: "2FA_ENABLED", actorId: userId, targetId: userId, req });

  void sendTwoFactorEnabledEmail({ to: user.email, name: user.name || "" }).catch((e) =>
    console.error("[2FA] enabled email failed:", e instanceof Error ? e.message : e)
  );

  return NextResponse.json({ ok: true });
}
