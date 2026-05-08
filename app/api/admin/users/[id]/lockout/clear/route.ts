import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUserId } from "@/lib/services/adminAuth";
import { recordAudit } from "@/lib/services/auditLogService";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const adminId = await requireAdminUserId();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: idStr } = await ctx.params;
  const id = parseInt(idStr);
  if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.user.update({
    where: { id },
    data: { loginAttempts: 0, loginLockedUntil: null },
  });
  await recordAudit({ event: "LOCKOUT_CLEARED", actorId: adminId, targetId: id, req });
  return NextResponse.json({ ok: true });
}
