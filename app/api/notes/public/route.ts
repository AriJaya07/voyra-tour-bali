import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TARGET_TYPES = ["tour", "destination", "place"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetType = searchParams.get("targetType");
  const targetKey = searchParams.get("targetKey");
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10"), 1), 50);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0);

  if (!targetType || !TARGET_TYPES.includes(targetType)) {
    return NextResponse.json({ error: "invalid targetType" }, { status: 400 });
  }
  if (!targetKey) {
    return NextResponse.json({ error: "targetKey required" }, { status: 400 });
  }

  const where = {
    targetType,
    targetKey,
    visibility: "PUBLIC",
    status: "APPROVED",
  };

  const [items, total] = await Promise.all([
    prisma.baliNote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        targetTitle: true,
        rating: true,
        body: true,
        createdAt: true,
        user: { select: { name: true, image: true } },
      },
    }),
    prisma.baliNote.count({ where }),
  ]);

  // Aggregate
  const ratingItems = await prisma.baliNote.findMany({
    where: { ...where, rating: { not: null } },
    select: { rating: true },
  });
  const ratingCount = ratingItems.length;
  const ratingAvg =
    ratingCount > 0 ? ratingItems.reduce((s, r) => s + (r.rating || 0), 0) / ratingCount : null;

  return NextResponse.json({
    items,
    total,
    ratingAvg,
    ratingCount,
  });
}
