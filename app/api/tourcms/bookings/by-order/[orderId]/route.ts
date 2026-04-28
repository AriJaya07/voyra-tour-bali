import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/utils/common/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = Number((session.user as { id?: number | string }).id);
    const role = (session.user as { role?: string }).role;
    const { orderId } = await params;

    const booking = await prisma.tourcmsBooking.findUnique({
      where: { paymentId: decodeURIComponent(orderId) },
    });
    if (!booking) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (booking.userId !== userId && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(booking);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("Error fetching TourCMS booking by order:", msg);
    return NextResponse.json(
      { error: "Failed to fetch booking" },
      { status: 500 }
    );
  }
}
