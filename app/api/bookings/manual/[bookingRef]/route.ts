import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/bookings/manual/[bookingRef]
 * Returns booking details for the manual payment page.
 * User must be authenticated and own the booking (or be admin).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookingRef: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookingRef } = await params;

    const booking = await prisma.booking.findFirst({
      where: { bookingRef },
      select: {
        id: true,
        bookingRef: true,
        productCode: true,
        productTitle: true,
        productImage: true,
        travelDate: true,
        pax: true,
        manualPrice: true,
        currency: true,
        leadFirstName: true,
        leadLastName: true,
        leadEmail: true,
        promoCode: true,
        status: true,
        isMockMode: true,
        userId: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const isOwner = booking.userId === parseInt(session.user.id);
    const isAdmin = session.user.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!booking.isMockMode) {
      return NextResponse.json({ error: "This is not a manual payment booking" }, { status: 400 });
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error("Error fetching manual booking:", error);
    return NextResponse.json({ error: "Failed to fetch booking" }, { status: 500 });
  }
}
