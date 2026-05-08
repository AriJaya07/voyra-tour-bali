import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendReferralInviteEmail } from "@/lib/email";

async function requireUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return parseInt(session.user.id);
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.referral.findMany({
    where: { inviterId: userId },
    orderBy: { createdAt: "desc" },
  });

  // Generate or fetch the user's reusable referral code (first PENDING invitation w/o email is treated as personal code)
  let personal = await prisma.referral.findFirst({
    where: { inviterId: userId, inviteeEmail: "" },
  });
  if (!personal) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    personal = await prisma.referral.create({
      data: {
        inviterId: userId,
        inviteeEmail: "",
        code,
        status: "PENDING",
      },
    });
  }

  return NextResponse.json({ personalCode: personal.code, referrals: items });
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const inviteeEmail: string = (body?.inviteeEmail || "").toString().trim().toLowerCase();
  if (!inviteeEmail.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) {
    return NextResponse.json({ error: "valid email required" }, { status: 400 });
  }

  // Don't allow inviting self
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
  if (me?.email && me.email.toLowerCase() === inviteeEmail) {
    return NextResponse.json({ error: "cannot invite yourself" }, { status: 400 });
  }

  // Hourly invite spam guard: max 20 emailed invites per inviter per hour
  const recent = await prisma.referral.count({
    where: {
      inviterId: userId,
      inviteeEmail: { not: "" },
      createdAt: { gte: new Date(Date.now() - 3_600_000) },
    },
  });
  if (recent >= 20) {
    return NextResponse.json({ error: "Slow down — try again later" }, { status: 429 });
  }

  const code = crypto.randomBytes(4).toString("hex").toUpperCase();

  try {
    const created = await prisma.referral.create({
      data: {
        inviterId: userId,
        inviteeEmail,
        code,
        status: "PENDING",
        attributionSource: "email",
      },
    });

    // Send invite email — non-blocking
    void sendReferralInviteEmail({
      to: inviteeEmail,
      inviterName: me?.name || "",
      code,
    }).catch((err) => {
      console.error("[Referral] invite email failed:", err instanceof Error ? err.message : err);
    });

    return NextResponse.json(created);
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Already invited that email" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create referral" }, { status: 500 });
  }
}
