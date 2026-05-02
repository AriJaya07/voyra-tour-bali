import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const productCode = searchParams.get("productCode");
  const source = searchParams.get("source");
  const mine = searchParams.get("mine") === "1";

  if (mine) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const reviews = await prisma.review.findMany({
      where: { userId: parseInt(session.user.id) },
      include: { booking: { select: { productTitle: true, productImage: true, travelDate: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(reviews);
  }

  if (!productCode || !source) {
    return NextResponse.json({ error: "productCode + source required" }, { status: 400 });
  }
  const reviews = await prisma.review.findMany({
    where: { productCode, source, status: "APPROVED" },
    include: { user: { select: { name: true, image: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const agg = await prisma.review.aggregate({
    where: { productCode, source, status: "APPROVED" },
    _avg: { rating: true },
    _count: { rating: true },
  });
  return NextResponse.json({
    reviews,
    averageRating: agg._avg.rating ?? 0,
    totalCount: agg._count.rating ?? 0,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { bookingId, productCode, source, rating, title, body: text, photos } = body ?? {};

  if (!productCode || !source || !rating || !text) {
    return NextResponse.json({ error: "productCode, source, rating, body required" }, { status: 400 });
  }
  const ratingNum = Number(rating);
  if (Number.isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return NextResponse.json({ error: "rating must be 1-5" }, { status: 400 });
  }

  const userId = parseInt(session.user.id);

  // Verified-booker enforcement: must own a COMPLETED booking matching productCode
  const verifiedBooking = await prisma.booking.findFirst({
    where: {
      userId,
      productCode,
      status: "COMPLETED",
      ...(bookingId ? { id: parseInt(bookingId) } : {}),
    },
    select: { id: true },
  });

  if (!verifiedBooking) {
    return NextResponse.json(
      { error: "You can only review tours you have completed." },
      { status: 403 }
    );
  }

  // One review per booking
  const existing = await prisma.review.findUnique({ where: { bookingId: verifiedBooking.id } });
  if (existing) {
    return NextResponse.json({ error: "You already reviewed this booking." }, { status: 409 });
  }

  const review = await prisma.review.create({
    data: {
      userId,
      bookingId: verifiedBooking.id,
      productCode,
      source,
      rating: ratingNum,
      title: title?.trim() || null,
      body: text.trim(),
      photos: Array.isArray(photos) ? photos : undefined,
      status: "PENDING",
    },
  });

  return NextResponse.json(review, { status: 201 });
}
