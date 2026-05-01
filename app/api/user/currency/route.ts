import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import { isCurrencyCode } from "@/utils/formatPrice";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: parseInt(session.user.id) },
    select: { currency: true },
  });
  return NextResponse.json({ currency: user?.currency ?? "IDR" });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const { currency } = body ?? {};
  if (!isCurrencyCode(currency)) {
    return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
  }
  const updated = await prisma.user.update({
    where: { id: parseInt(session.user.id) },
    data: { currency },
    select: { currency: true },
  });
  return NextResponse.json(updated);
}
