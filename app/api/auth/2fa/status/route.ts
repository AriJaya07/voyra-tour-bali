import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

/**
 * Read-only status snapshot for /profile/security. Never returns the secret.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);

  const [user, backupRemaining, trustedCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
        twoFactorEnrolledAt: true,
        twoFactorMethod: true,
        provider: true,
      },
    }),
    prisma.twoFactorBackupCode.count({ where: { userId, usedAt: null } }),
    prisma.trustedDevice.count({
      where: { userId, expiresAt: { gt: new Date() } },
    }),
  ]);

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    enabled: user.twoFactorEnabled,
    enrolledAt: user.twoFactorEnrolledAt,
    method: user.twoFactorMethod,
    provider: user.provider,
    backupRemaining,
    trustedDevices: trustedCount,
  });
}
