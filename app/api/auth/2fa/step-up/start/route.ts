import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import { createChallenge } from "@/lib/services/twoFactorService";
import { hashIp, hashUa } from "@/lib/services/auditLogService";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true },
  });
  if (!user?.twoFactorEnabled) {
    return NextResponse.json({ enabled: false });
  }

  const challenge = await createChallenge({
    userId,
    purpose: "STEP_UP",
    method: "TOTP",
    ipHash: hashIp(req),
    uaHash: hashUa(req),
  });

  const backupAvailable =
    (await prisma.twoFactorBackupCode.count({
      where: { userId, usedAt: null },
    })) > 0;

  return NextResponse.json({
    enabled: true,
    challengeId: challenge.id,
    methods: ["TOTP", ...(backupAvailable ? ["BACKUP"] : [])],
    expiresAt: challenge.expiresAt.toISOString(),
  });
}
