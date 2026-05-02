import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/ai/refund
 * Body: { paymentId: string, reason?: string }
 *
 * Mark an AiPayment as REFUNDED + remove granted credits if any. Reverses the
 * AiCreditGrant rows (refId === paymentId), zeroing remaining credits and
 * subtracting from wallet balance + lifetimeEarned. Best-effort: refund the
 * Midtrans payment in their dashboard separately.
 *
 * ADMIN-only.
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
    const paymentId = typeof body?.paymentId === "string" ? body.paymentId : "";
    const reason = typeof body?.reason === "string" ? body.reason.slice(0, 200) : "admin refund";
    if (!paymentId) {
      return NextResponse.json({ error: "paymentId required" }, { status: 400 });
    }

    const payment = await prisma.aiPayment.findUnique({ where: { paymentId } });
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }
    if (payment.status === "REFUNDED") {
      return NextResponse.json({ message: "Already refunded" });
    }

    const grants = await prisma.aiCreditGrant.findMany({
      where: { refId: paymentId },
    });

    let totalReclaimed = 0;
    let totalGranted = 0;

    await prisma.$transaction(async (tx) => {
      for (const g of grants) {
        const reclaim = g.remaining; // credits not yet spent
        totalReclaimed += reclaim;
        totalGranted += g.amount;
        await tx.aiCreditGrant.update({
          where: { id: g.id },
          data: { remaining: 0, expiredAt: new Date() },
        });
      }

      if (totalReclaimed > 0) {
        await tx.aiCreditWallet.update({
          where: { userId: payment.userId },
          data: {
            balance: { decrement: totalReclaimed },
            lifetimeEarned: { decrement: totalReclaimed },
          },
        });
        await tx.aiCreditLedger.create({
          data: {
            userId: payment.userId,
            delta: -totalReclaimed,
            reason: "REFUND",
            refId: paymentId,
            meta: { adminId: session.user.id, reason, totalGranted, totalReclaimed },
          },
        });
      }

      await tx.aiPayment.update({
        where: { id: payment.id },
        data: { status: "REFUNDED" },
      });
    });

    return NextResponse.json({
      message: "Refunded",
      paymentId,
      kind: payment.kind,
      totalGranted,
      reclaimed: totalReclaimed,
      note:
        totalGranted - totalReclaimed > 0
          ? `${totalGranted - totalReclaimed} credits already spent — issue admin grant if customer needs full restoration.`
          : null,
    });
  } catch (error) {
    console.error("Error in admin AI refund:", error);
    return NextResponse.json({ error: "Refund failed" }, { status: 500 });
  }
}
