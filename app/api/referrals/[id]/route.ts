import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import { sendReferralInviteEmail } from "@/lib/email";

async function loadOwned(idStr: string, userId: number) {
  const id = parseInt(idStr);
  if (Number.isNaN(id)) return null;
  const ref = await prisma.referral.findUnique({ where: { id } });
  if (!ref || ref.inviterId !== userId) return null;
  return ref;
}

// DELETE — cancel a PENDING invite (only if status PENDING and email present)
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);
  const { id } = await ctx.params;

  const ref = await loadOwned(id, userId);
  if (!ref) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!ref.inviteeEmail) {
    return NextResponse.json({ error: "Cannot delete personal code" }, { status: 400 });
  }
  if (ref.status !== "PENDING") {
    return NextResponse.json({ error: "Already used — cannot cancel" }, { status: 400 });
  }

  await prisma.referral.delete({ where: { id: ref.id } });
  return NextResponse.json({ ok: true });
}

// POST /api/referrals/:id  — resend invite email (rate-limit 1/24h per row)
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);
  const { id } = await ctx.params;

  const ref = await loadOwned(id, userId);
  if (!ref) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!ref.inviteeEmail) {
    return NextResponse.json({ error: "No email on file" }, { status: 400 });
  }
  if (ref.status === "ACTIVE") {
    return NextResponse.json({ error: "Already booking — no need to resend" }, { status: 400 });
  }
  if (ref.lastSharedAt && ref.lastSharedAt.getTime() > Date.now() - 86_400_000) {
    return NextResponse.json({ error: "Resent recently — wait 24h" }, { status: 429 });
  }

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

  try {
    await sendReferralInviteEmail({
      to: ref.inviteeEmail,
      inviterName: me?.name || "",
      code: ref.code,
    });
  } catch (err) {
    console.error("[Referral] resend failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Email send failed" }, { status: 500 });
  }

  await prisma.referral.update({
    where: { id: ref.id },
    data: { lastSharedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
