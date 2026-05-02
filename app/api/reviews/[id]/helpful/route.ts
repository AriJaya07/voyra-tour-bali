import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE_PREFIX = "voyra_helpful_";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const reviewId = parseInt(id);
  if (Number.isNaN(reviewId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const cookieName = `${COOKIE_PREFIX}${reviewId}`;
  if (cookieStore.get(cookieName)) {
    return NextResponse.json({ error: "Already voted" }, { status: 409 });
  }

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, status: true },
  });
  if (!review || review.status !== "APPROVED") {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: { helpfulCount: { increment: 1 } },
    select: { helpfulCount: true },
  });

  cookieStore.set(cookieName, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
  });

  return NextResponse.json({ helpfulCount: updated.helpfulCount });
}
