import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

const EXPIRY_HOURS = 24;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

// GET /api/admin/mock-bookings?page=1&limit=20
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Auto-delete records older than EXPIRY_DAYS
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() - EXPIRY_HOURS);
    const { count: deletedCount } = await prisma.mockBooking.deleteMany({
      where: { createdAt: { lt: expiryDate } },
    });

    // 2. Parse pagination params
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT))));
    const skip = (page - 1) * limit;

    // 3. Fetch page + total in parallel
    const [bookings, total] = await Promise.all([
      prisma.mockBooking.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.mockBooking.count(),
    ]);

    return NextResponse.json({
      bookings,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      limit,
      deletedCount,
    });
  } catch (error) {
    console.error("[mock-bookings] GET failed:", error instanceof Error ? error.message : "Unknown");
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

    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: "Invalid slug format. Use only lowercase letters, numbers, and dashes." },
        { status: 400 }
      );
    }

    const existing = await prisma.mockBooking.findUnique({ where: { slug } });
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
    console.error("[mock-bookings] POST failed:", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json({ error: "Failed to create mock booking" }, { status: 500 });
  }
}
