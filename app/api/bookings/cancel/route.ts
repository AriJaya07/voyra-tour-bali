import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

/**
 * Cancellation endpoint.
 * - Local: simple status flip to CANCELLED (admin handles refund manually via Midtrans dashboard).
 * - Viator: this route does NOT call Viator — that flow lives at /api/viator/cancel.
 *   For Viator bookings, return 422 directing user to the partner cancel link.
 *
 * Cancellation window enforcement: refund eligibility checked client-side; this endpoint
 * just records the cancellation. Refund itself processed by admin or Midtrans webhook.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);

  const body = await req.json().catch(() => ({}));
  const bookingId = parseInt(body?.bookingId || "0");
  const reason: string = typeof body?.reason === "string" ? body.reason.slice(0, 500) : "";

  if (!bookingId) {
    return NextResponse.json({ error: "bookingId required" }, { status: 400 });
  }

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, userId },
  });
  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (["COMPLETED", "CANCELLED"].includes(booking.status)) {
    return NextResponse.json({ error: `Booking already ${booking.status}` }, { status: 422 });
  }

  if (booking.source === "viator" && booking.viatorBookingRef) {
    return NextResponse.json(
      {
        error:
          "This booking was confirmed with our partner. Please cancel from the partner manage-booking link in your confirmation email, or message our concierge.",
        managePartner: true,
      },
      { status: 422 }
    );
  }

  // Cancellation window — local bookings: free cancel >24h before travelDate, no refund inside.
  // Just record status; admin processes refund.
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "CANCELLED",
      viatorBookingError: reason ? `User cancelled: ${reason}` : "User cancelled",
    },
  });

  return NextResponse.json({ ok: true });
}
