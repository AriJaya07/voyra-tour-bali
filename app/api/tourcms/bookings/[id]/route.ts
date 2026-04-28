import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/utils/common/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = Number((session.user as { id?: number | string }).id);
    const { id } = await params;
    const bookingId = Number(id);
    if (!bookingId) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const booking = await prisma.tourcmsBooking.findUnique({
      where: { id: bookingId },
      include: { travelers: true },
    });
    if (!booking) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const role = (session.user as { role?: string }).role;
    if (booking.userId !== userId && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(booking);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("Error fetching TourCMS booking:", msg);
    return NextResponse.json(
      { error: "Failed to fetch booking" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = (session.user as { role?: string }).role;
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const body = (await req.json()) as { status?: string };
    if (!body.status) {
      return NextResponse.json({ error: "status required" }, { status: 400 });
    }
    const allowed = ["PENDING", "PAYMENT", "CONFIRMED", "COMPLETED", "CANCELLED"];
    if (!allowed.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    const updated = await prisma.tourcmsBooking.update({
      where: { id: Number(id) },
      data: {
        status: body.status as
          | "PENDING"
          | "PAYMENT"
          | "CONFIRMED"
          | "COMPLETED"
          | "CANCELLED",
      },
    });
    return NextResponse.json({ message: "Updated", booking: updated });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("Error updating TourCMS booking:", msg);
    return NextResponse.json(
      { error: "Failed to update booking" },
      { status: 500 }
    );
  }
}
