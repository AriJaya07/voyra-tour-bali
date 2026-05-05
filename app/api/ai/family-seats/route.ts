import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "crypto";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import { AI_PLANS } from "@/lib/config/aiPlans";
import { sendNotificationEmail } from "@/lib/email";

/**
 * Family seats — Founder-only. Owner can invite up to features.familySeats
 * other accounts (or pending email invites). Seat-holders inherit the owner's
 * plan features (canUseFeature falls through via getEffectivePlan), but spend
 * their own credit balance.
 *
 * GET    /api/ai/family-seats             — list seats owned by signed-in user
 * POST   /api/ai/family-seats { email }   — invite a seat
 * DELETE /api/ai/family-seats?id=N        — revoke a seat
 */

async function ownerInfo(userId: number) {
  const sub = await prisma.aiSubscription.findUnique({ where: { userId } });
  if (!sub || (sub.status !== "ACTIVE" && sub.status !== "GRACE")) return null;
  const planDef = AI_PLANS[sub.plan as keyof typeof AI_PLANS];
  if (!planDef || planDef.features.familySeats <= 0) return null;
  return { sub, maxSeats: planDef.features.familySeats };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const owner = await ownerInfo(userId);
    if (!owner) {
      // Non-Founder: silent empty list. UI panel hides on maxSeats <= 0.
      return NextResponse.json({ maxSeats: 0, used: 0, seats: [] });
    }

    const seats = await prisma.aiFamilySeat.findMany({
      where: { ownerUserId: userId, revokedAt: null },
      include: { member: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      maxSeats: owner.maxSeats,
      used: seats.length,
      seats: seats.map((s) => ({
        id: s.id,
        memberUserId: s.memberUserId,
        memberName: s.member?.name ?? null,
        memberEmail: s.member?.email ?? s.inviteEmail ?? null,
        inviteEmail: s.inviteEmail,
        accepted: !!s.acceptedAt,
        createdAt: s.createdAt,
      })),
    });
  } catch (error) {
    console.error("[ai/family-seats GET]", error);
    return NextResponse.json({ error: "Failed to list seats" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const owner = await ownerInfo(userId);
    if (!owner) {
      return NextResponse.json(
        { error: "Family seats require an active Founder subscription.", reason: "FEATURE_LOCKED", upgradeUrl: "/ai/pricing" },
        { status: 402 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const ownerUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (ownerUser?.email?.toLowerCase() === email) {
      return NextResponse.json({ error: "Cannot invite yourself" }, { status: 400 });
    }

    // Capacity check (only count active, non-revoked seats)
    const existingSeats = await prisma.aiFamilySeat.count({
      where: { ownerUserId: userId, revokedAt: null },
    });
    if (existingSeats >= owner.maxSeats) {
      return NextResponse.json(
        { error: `You've used all ${owner.maxSeats} seats. Revoke one to free a slot.` },
        { status: 409 }
      );
    }

    // De-dupe: same email already invited by this owner
    const dupe = await prisma.aiFamilySeat.findFirst({
      where: { ownerUserId: userId, inviteEmail: email, revokedAt: null },
    });
    if (dupe) return NextResponse.json({ error: "Already invited", seatId: dupe.id }, { status: 409 });

    // Match existing user when possible
    const member = await prisma.user.findUnique({ where: { email } });

    // Reject if member already holds a different active seat
    if (member) {
      const existingMembership = await prisma.aiFamilySeat.findUnique({
        where: { memberUserId: member.id },
      });
      if (existingMembership && existingMembership.revokedAt === null) {
        return NextResponse.json(
          { error: "That account already holds a seat with another plan owner." },
          { status: 409 }
        );
      }
    }

    const inviteToken = crypto.randomBytes(24).toString("hex");
    const seat = await prisma.aiFamilySeat.create({
      data: {
        ownerUserId: userId,
        memberUserId: member?.id ?? null,
        inviteEmail: email,
        inviteToken,
        // If invitee is already a Voyra user, auto-accept (skip email round-trip).
        acceptedAt: member ? new Date() : null,
      },
    });

    // Notify the invitee
    const siteUrl = process.env.NEXTAUTH_URL ?? "";
    const acceptUrl = `${siteUrl}/profile/ai?accept-seat=${inviteToken}`;
    sendNotificationEmail({
      to: email,
      userName: member?.name ?? "there",
      title: `${ownerUser?.name ?? "A friend"} invited you to a Voyra AI Founder seat`,
      body: member
        ? `You've been added to a Founder family plan. Premium AI features (Concierge, Day-of-trip, Voucher reader) are now unlocked on your existing account.`
        : `You've been invited to share a Founder plan. Click below to accept the seat — premium AI features unlock instantly.`,
      url: member ? `${siteUrl}/profile/ai` : acceptUrl,
    }).catch((e) => console.error("[FamilySeats] email failed:", e?.message ?? e));

    return NextResponse.json({
      id: seat.id,
      inviteEmail: seat.inviteEmail,
      acceptedAt: seat.acceptedAt,
      autoAccepted: !!member,
    }, { status: 201 });
  } catch (error) {
    console.error("[ai/family-seats POST]", error);
    return NextResponse.json({ error: "Failed to invite" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const seat = await prisma.aiFamilySeat.findFirst({
      where: { id, ownerUserId: userId },
    });
    if (!seat) return NextResponse.json({ error: "Seat not found" }, { status: 404 });

    await prisma.aiFamilySeat.update({
      where: { id },
      data: { revokedAt: new Date() },
    });

    return NextResponse.json({ message: "Seat revoked", id });
  } catch (error) {
    console.error("[ai/family-seats DELETE]", error);
    return NextResponse.json({ error: "Failed to revoke" }, { status: 500 });
  }
}
