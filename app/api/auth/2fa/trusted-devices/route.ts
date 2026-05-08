import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/services/auditLogService";
import { TRUSTED_DEVICE_COOKIE } from "@/lib/services/twoFactorService";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);
  const devices = await prisma.trustedDevice.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { lastUsedAt: "desc" },
    select: {
      id: true,
      label: true,
      lastUsedAt: true,
      createdAt: true,
      expiresAt: true,
    },
  });
  return NextResponse.json({ devices });
}

// DELETE — body { id?: number }, missing id = revoke all
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);
  const body = await req.json().catch(() => ({}));
  const id = body?.id ? Number(body.id) : null;

  if (id) {
    const dev = await prisma.trustedDevice.findUnique({ where: { id } });
    if (!dev || dev.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.trustedDevice.delete({ where: { id } });
    await recordAudit({
      event: "TRUSTED_DEVICE_REVOKED",
      actorId: userId,
      targetId: userId,
      req,
    });
  } else {
    await prisma.$transaction([
      prisma.trustedDevice.deleteMany({ where: { userId } }),
      prisma.user.update({
        where: { id: userId },
        data: { twoFactorEpoch: { increment: 1 } },
      }),
    ]);
    await recordAudit({
      event: "TRUSTED_DEVICES_REVOKED_ALL",
      actorId: userId,
      targetId: userId,
      req,
    });
  }

  const res = NextResponse.json({ ok: true });
  // Drop the cookie on the current device too
  res.cookies.set(TRUSTED_DEVICE_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
