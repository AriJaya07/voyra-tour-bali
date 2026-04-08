import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/admin/bookings/[id]/set-manual-price
 * Admin endpoint to set a manual price on a mock booking.
 * After setting the price, the admin can share /payment/manual/[bookingRef] with the user.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const bookingId = parseInt(id);
    if (isNaN(bookingId)) {
      return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 });
    }

    const body = await req.json();
    const { manualPrice } = body;

    if (!manualPrice || typeof manualPrice !== "number" || manualPrice <= 0) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    if (!booking.isMockMode) {
      return NextResponse.json({ error: "Manual price can only be set on mock bookings" }, { status: 400 });
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        manualPrice,
        status: "PENDING",
      },
    });

    return NextResponse.json({ success: true, booking: updated });
  } catch (error) {
    console.error("Error setting manual price:", error);
    return NextResponse.json({ error: "Failed to set manual price" }, { status: 500 });
  }
}
