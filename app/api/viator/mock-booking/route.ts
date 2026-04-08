import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * POST /api/viator/mock-booking
 * Called when user clicks "Booking Now" on a Viator product page in mock mode.
 * Creates a MockBooking record and returns the slug for redirect to /v/[slug].
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { productCode, productTitle, productImage, price, currency, promoCode } = body;

    if (!productCode || !productTitle) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Auto-generate a unique slug from the product title
    const base = productTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")
      .substring(0, 40);
    const randomStr = crypto.randomBytes(3).toString("hex");
    const slug = `${base}-${randomStr}`;

    const mockBooking = await prisma.mockBooking.create({
      data: {
        slug,
        productCode,
        productTitle,
        productImage: productImage || null,
        price: price || null,
        currency: currency || "IDR",
        username: session.user.name || session.user.email || null,
        promoCode: promoCode || null,
      },
    });

    return NextResponse.json({ success: true, slug: mockBooking.slug });
  } catch (error) {
    console.error("Error creating mock booking:", error);
    return NextResponse.json({ error: "Failed to create mock booking" }, { status: 500 });
  }
}
