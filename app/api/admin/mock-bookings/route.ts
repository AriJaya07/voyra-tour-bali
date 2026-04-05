import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/mock-bookings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mockBookings = await prisma.mockBooking.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(mockBookings);
  } catch (error) {
    console.error("Failed to fetch mock bookings:", error);
    return NextResponse.json({ error: "Failed to fetch mock bookings" }, { status: 500 });
  }
}

// POST /api/admin/mock-bookings
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { slug, productCode, productTitle, productImage, price, currency } = body;

    // Validate slug
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ error: "Invalid slug format. Use only lowercase letters, numbers, and dashes." }, { status: 400 });
    }

    // Check if slug exists
    const existing = await prisma.mockBooking.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json({ error: "Slug already exists." }, { status: 400 });
    }

    const mockBooking = await prisma.mockBooking.create({
      data: {
        slug,
        productCode,
        productTitle,
        productImage,
        price,
        currency: currency || "IDR",
      },
    });

    return NextResponse.json({ success: true, mockBooking });
  } catch (error) {
    console.error("Failed to create mock booking:", error);
    return NextResponse.json({ error: "Failed to create mock booking" }, { status: 500 });
  }
}
