import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUserId } from "@/lib/services/adminAuth";
import { recordAudit } from "@/lib/services/auditLogService";
import { sendTwoFactorDisabledEmail } from "@/lib/email";

/**
 * Admin: hard-disable 2FA. Same wipe as reset but the user is NOT pushed to
 * re-enroll on next sign-in. Use only when user explicitly cannot use 2FA.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const adminId = await requireAdminUserId();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: idStr } = await ctx.params;
  const id = parseInt(idStr);
  if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  if (id === adminId) {
    return NextResponse.json({ error: "Admins cannot disable their own 2FA from this UI." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const reason = String(body?.reason || "").slice(0, 500);
  const confirmEmail = String(body?.confirmEmail || "").trim().toLowerCase();

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true },
  });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (target.email.toLowerCase() !== confirmEmail) {
    return NextResponse.json({ error: "Email confirmation does not match" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorEnrolledAt: null,
        twoFactorMethod: null,
        twoFactorEpoch: { increment: 1 },
        totpLastWindow: null,
      },
    }),
    prisma.twoFactorBackupCode.deleteMany({ where: { userId: id } }),
    prisma.trustedDevice.deleteMany({ where: { userId: id } }),
    prisma.twoFactorChallenge.deleteMany({ where: { userId: id } }),
  ]);

  void recordAudit({
    event: "2FA_ADMIN_DISABLED",
    actorId: adminId,
    targetId: id,
    req,
    meta: { reason },
  });

  void sendTwoFactorDisabledEmail({
    to: target.email,
    name: target.name || "",
    byAdmin: true,
  }).catch((e) => console.error("[Admin] disable email failed:", e instanceof Error ? e.message : e));

  return NextResponse.json({ ok: true });
}
