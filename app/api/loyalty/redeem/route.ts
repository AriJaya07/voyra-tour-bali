import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

/**
 * Legacy: redeem loyalty points for an IDR discount code.
 *
 * Phase 10 (2026-05-03): all rewards now mint AI credits. This endpoint is in
 * a 60-day sunset window — it returns 410 Gone after `DISCOUNT_CODE_SUNSET_AT`.
 * Until then, existing balances can still mint a discount code so users with
 * outstanding points aren't left holding nothing.
 *
 * The new path: POST /api/ai/loyalty-redeem (1,000 pts → 100 AI credits).
 */
const RATE_PER_1000PTS_IDR = 50_000;
const MIN_REDEEM = 1000;
const MAX_REDEEM = 50_000;
const DISCOUNT_CODE_SUNSET_AT = new Date("2026-07-02T00:00:00Z"); // 60 days from cutover

export async function POST(req: NextRequest) {
  if (Date.now() >= DISCOUNT_CODE_SUNSET_AT.getTime()) {
    return NextResponse.json(
      {
        error: "Discount-code redemption has been retired. Redeem points for AI credits instead at Profile → AI Wallet.",
        replacement: "/api/ai/loyalty-redeem",
      },
      { status: 410 }
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);

  const body = await req.json().catch(() => ({}));
  const points = Math.floor(parseInt(body?.points || "0"));
  if (!points || points < MIN_REDEEM || points > MAX_REDEEM) {
    return NextResponse.json(
      { error: `Redeem ${MIN_REDEEM}-${MAX_REDEEM} points per request` },
      { status: 400 }
    );
  }
  if (points % 1000 !== 0) {
    return NextResponse.json({ error: "Redeem in 1000-point increments" }, { status: 400 });
  }

  const account = await prisma.loyaltyAccount.findUnique({ where: { userId } });
  if (!account || account.pointsBalance < points) {
    return NextResponse.json({ error: "Not enough points" }, { status: 400 });
  }

  const idrValue = (points / 1000) * RATE_PER_1000PTS_IDR;
  const code = `VOYRA-${userId}-${Date.now().toString(36).toUpperCase()}`;

  await prisma.$transaction([
    prisma.loyaltyAccount.update({
      where: { userId },
      data: { pointsBalance: { decrement: points } },
    }),
    prisma.loyaltyLedger.create({
      data: {
        userId,
        delta: -points,
        reason: "REDEEM",
        refId: code,
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    code,
    points,
    idrValue,
    note: `Paste this code at checkout. Saves Rp ${idrValue.toLocaleString("id-ID")}.`,
  });
}
