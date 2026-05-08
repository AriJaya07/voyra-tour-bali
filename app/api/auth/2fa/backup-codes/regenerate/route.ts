import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import {
  generateBackupCodes,
  verifyTotpForUser,
} from "@/lib/services/twoFactorService";
import { recordAudit } from "@/lib/services/auditLogService";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);

  const body = await req.json().catch(() => ({}));
  const code = String(body?.code || "");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true },
  });
  if (!user?.twoFactorEnabled) {
    return NextResponse.json({ error: "2FA is not enabled" }, { status: 400 });
  }

  const ok = await verifyTotpForUser(userId, code);
  if (!ok) return NextResponse.json({ error: "Invalid code" }, { status: 401 });

  const backupCodes = await generateBackupCodes(userId, 10);
  void recordAudit({
    event: "2FA_BACKUP_CODES_REGEN",
    actorId: userId,
    targetId: userId,
    req,
  });
  return NextResponse.json({ backupCodes });
}
