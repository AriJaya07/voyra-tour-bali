import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import { grantCredits } from "@/lib/services/aiCreditService";

/**
 * POST /api/admin/ai/grant
 * Body: { userId: number, amount: number, expiresInDays?: number, reason?: string }
 *
 * Manual credit grant — refund-by-hand, customer support gestures, internal QA.
 * ADMIN-only. Always tagged with source=ADJUST and admin user as refId for audit.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const targetUserId = Number(body?.userId);
    const amount = Number(body?.amount);
    const expiresInDays = Number.isFinite(Number(body?.expiresInDays))
      ? Number(body.expiresInDays)
      : 365;
    const reason = typeof body?.reason === "string" ? body.reason.slice(0, 200) : "Manual grant";

    if (!Number.isFinite(targetUserId) || targetUserId <= 0) {
      return NextResponse.json({ error: "Valid userId required" }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100_000) {
      return NextResponse.json({ error: "Amount must be between 1 and 100,000" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true },
    });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const refId = `ADMIN-GRANT-${session.user.id}-${Date.now()}`;
    await grantCredits({
      userId: target.id,
      source: "ADJUST",
      amount,
      expiresInDays,
      refId,
      reasonOverride: `GRANT_ADJUST: ${reason}`,
    });

    return NextResponse.json({
      message: "Credits granted",
      userId: target.id,
      amount,
      expiresInDays,
      refId,
    });
  } catch (error) {
    console.error("Error in admin AI grant:", error);
    return NextResponse.json({ error: "Failed to grant" }, { status: 500 });
  }
}
