import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import { grantCredits, LOYALTY_GRANT_TTL_DAYS } from "@/lib/services/aiCreditService";

/**
 * POST /api/ai/loyalty-redeem  Body: { points }
 *
 * Convert loyalty points → AI credits at a fixed ratio.
 * 1,000 pts → 100 AI credits. Open to all tiers (Phase 10 — booking accrual
 * no longer mints points, so legacy balances are a one-time stock; sweetened
 * rate clears them quickly).
 *
 * Atomic: deducts loyalty + writes ledger row + grants AI credits in one TX.
 */

const POINTS_PER_REDEMPTION = 1_000;
const CREDITS_PER_REDEMPTION = 100;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const body = await req.json().catch(() => ({}));
    const points = Math.floor(Number(body?.points));
    if (!Number.isFinite(points) || points <= 0 || points % POINTS_PER_REDEMPTION !== 0) {
      return NextResponse.json(
        { error: `Points must be a positive multiple of ${POINTS_PER_REDEMPTION}` },
        { status: 400 }
      );
    }

    const account = await prisma.loyaltyAccount.findUnique({ where: { userId } });
    if (!account || account.pointsBalance < points) {
      return NextResponse.json(
        { error: "Insufficient loyalty points", balance: account?.pointsBalance ?? 0 },
        { status: 409 }
      );
    }

    const credits = (points / POINTS_PER_REDEMPTION) * CREDITS_PER_REDEMPTION;
    const refId = `LOYALTY-REDEEM-${userId}-${Date.now()}`;

    await prisma.$transaction(async (tx) => {
      await tx.loyaltyAccount.update({
        where: { userId },
        data: { pointsBalance: { decrement: points } },
      });
      await tx.loyaltyLedger.create({
        data: {
          userId,
          delta: -points,
          reason: "REDEEM",
          refId,
        },
      });
    });

    await grantCredits({
      userId,
      source: "LOYALTY_REDEEM",
      amount: credits,
      expiresInDays: LOYALTY_GRANT_TTL_DAYS,
      refId,
    });

    return NextResponse.json({
      pointsRedeemed: points,
      creditsGranted: credits,
      newPointsBalance: account.pointsBalance - points,
      expiresInDays: LOYALTY_GRANT_TTL_DAYS,
      refId,
    });
  } catch (error) {
    console.error("[ai/loyalty-redeem]", error);
    return NextResponse.json({ error: "Redemption failed" }, { status: 500 });
  }
}
