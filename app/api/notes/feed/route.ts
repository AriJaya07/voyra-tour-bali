import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "30"), 1), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0);
  const targetType = searchParams.get("targetType");

  const where: any = {
    visibility: "PUBLIC",
    status: "APPROVED",
  };
  if (targetType && ["tour", "destination", "place"].includes(targetType)) {
    where.targetType = targetType;
  }

  const [items, total] = await Promise.all([
    prisma.baliNote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        targetType: true,
        targetKey: true,
        targetTitle: true,
        rating: true,
        body: true,
        createdAt: true,
        user: { select: { name: true, image: true } },
      },
    }),
    prisma.baliNote.count({ where }),
  ]);

  return NextResponse.json({ items, total, hasMore: offset + items.length < total });
}
