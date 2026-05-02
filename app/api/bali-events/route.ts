import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const upcoming = searchParams.get("upcoming") === "true";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

  const where = upcoming ? { date: { gte: new Date() } } : {};
  const items = await prisma.baliEvent.findMany({
    where,
    orderBy: { date: "asc" },
    take: limit,
  });
  return NextResponse.json(items);
}
