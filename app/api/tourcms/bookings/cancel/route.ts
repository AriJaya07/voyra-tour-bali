import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/utils/common/auth";
import { tourcmsClient } from "@/lib/api/tourcms-client";
import { TOURCMS_MOCK } from "@/lib/config/tourcms";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = Number((session.user as { id?: number | string }).id);
    const role = (session.user as { role?: string }).role;

    const body = (await req.json()) as { bookingId?: number; reason?: string };
    if (!body.bookingId) {
      return NextResponse.json({ error: "bookingId required" }, { status: 400 });
    }

    const booking = await prisma.tourcmsBooking.findUnique({
      where: { id: body.bookingId },
    });
    if (!booking) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (booking.userId !== userId && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!TOURCMS_MOCK && booking.tourcmsBookingRef) {
      await tourcmsClient.cancelBooking({
        channelId: booking.channelId,
        tourcmsBookingRef: booking.tourcmsBookingRef,
        reason: body.reason,
        cancelReasonCode: 22,
      });
    }

    const updated = await prisma.tourcmsBooking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED", tourcmsBookingStatus: "CANCELLED" },
    });

    return NextResponse.json({ message: "Cancelled", booking: updated });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("Error cancelling TourCMS booking:", msg);
    return NextResponse.json(
      { error: "Failed to cancel booking" },
      { status: 500 }
    );
  }
}
