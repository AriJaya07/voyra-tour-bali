import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/ai/family-seats/accept  Body: { token }
 *
 * Email-invited member calls this once they've signed in to claim their seat.
 * Token-based — owner sends `?accept-seat=<token>` link in invite email.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token : "";
    if (!token) return NextResponse.json({ error: "Invite token required" }, { status: 400 });

    const seat = await prisma.aiFamilySeat.findUnique({ where: { inviteToken: token } });
    if (!seat) return NextResponse.json({ error: "Invalid invite" }, { status: 404 });
    if (seat.revokedAt) return NextResponse.json({ error: "Invite revoked" }, { status: 410 });
    if (seat.acceptedAt && seat.memberUserId === userId) {
      return NextResponse.json({ message: "Already accepted", seatId: seat.id });
    }

    // The inviter targeted an email — only that email's user can accept.
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (seat.inviteEmail && me?.email?.toLowerCase() !== seat.inviteEmail.toLowerCase()) {
      return NextResponse.json(
        { error: "This invite was sent to a different email." },
        { status: 403 }
      );
    }

    // Reject if user already holds another active seat
    const existing = await prisma.aiFamilySeat.findUnique({ where: { memberUserId: userId } });
    if (existing && existing.id !== seat.id && existing.revokedAt === null) {
      return NextResponse.json(
        { error: "You already hold a family seat with another owner." },
        { status: 409 }
      );
    }

    await prisma.aiFamilySeat.update({
      where: { id: seat.id },
      data: { memberUserId: userId, acceptedAt: new Date() },
    });

    return NextResponse.json({ message: "Seat accepted", seatId: seat.id });
  } catch (error) {
    console.error("[ai/family-seats/accept]", error);
    return NextResponse.json({ error: "Failed to accept invite" }, { status: 500 });
  }
}
