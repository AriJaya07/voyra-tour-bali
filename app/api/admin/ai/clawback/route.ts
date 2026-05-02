import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import { clawbackBookingRewards } from "@/lib/services/rewardService";

/**
 * POST /api/admin/ai/clawback
 * Body: { bookingRef: string }
 *
 * Manual reward clawback for confirmed-fraud cases. Idempotent — already-spent
 * credits are never reversed (no surprise debt). ADMIN-only.
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
    const bookingRef = typeof body?.bookingRef === "string" ? body.bookingRef : "";
    if (!bookingRef) {
      return NextResponse.json({ error: "bookingRef required" }, { status: 400 });
    }

    const booking = await prisma.booking.findFirst({
      where: { bookingRef },
      select: {
        id: true,
        bookingRef: true,
        userId: true,
        totalPrice: true,
        status: true,
        isMockMode: true,
      },
    });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const result = await clawbackBookingRewards(booking as never);

    return NextResponse.json({
      bookingRef: booking.bookingRef,
      bookingStatus: booking.status,
      reclaimedCredits: result.reclaimed,
      tierDecremented: result.bookingDecremented,
    });
  } catch (error) {
    console.error("Error in admin clawback:", error);
    return NextResponse.json({ error: "Clawback failed" }, { status: 500 });
  }
}
