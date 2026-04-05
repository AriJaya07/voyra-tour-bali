import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const mockBookingId = parseInt(id, 10);

    if (isNaN(mockBookingId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    await prisma.mockBooking.delete({
      where: { id: mockBookingId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete mock booking:", error);
    return NextResponse.json({ error: "Failed to delete mock booking" }, { status: 500 });
  }
}
