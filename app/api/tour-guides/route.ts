import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const operatorId = searchParams.get("operatorId");
  const where = operatorId ? { operatorId: parseInt(operatorId) } : {};
  const guides = await prisma.tourGuide.findMany({
    where,
    orderBy: { rating: "desc" },
    take: 50,
  });
  return NextResponse.json(guides);
}
