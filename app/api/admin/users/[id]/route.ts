import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUserId } from "@/lib/services/adminAuth";
import { recordAudit } from "@/lib/services/auditLogService";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const adminId = await requireAdminUserId();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: idStr } = await ctx.params;
  const id = parseInt(idStr);
  if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      provider: true,
      emailVerified: true,
      twoFactorEnabled: true,
      twoFactorEnrolledAt: true,
      twoFactorMethod: true,
      twoFactorEpoch: true,
      loginAttempts: true,
      loginLockedUntil: true,
      createdAt: true,
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [backupRemaining, trustedDevices, recentFails] = await Promise.all([
    prisma.twoFactorBackupCode.count({ where: { userId: id, usedAt: null } }),
    prisma.trustedDevice.count({ where: { userId: id, expiresAt: { gt: new Date() } } }),
    prisma.auditLog.count({
      where: {
        targetId: id,
        event: "2FA_LOGIN_FAIL",
        createdAt: { gte: new Date(Date.now() - 86_400_000) },
      },
    }),
  ]);

  void recordAudit({ event: "ADMIN_USER_VIEW", actorId: adminId, targetId: id, req });

  return NextResponse.json({
    user,
    security: {
      backupRemaining,
      trustedDevices,
      recentFailedMfa24h: recentFails,
    },
  });
}
