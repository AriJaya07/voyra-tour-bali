import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const items = await prisma.wishlistItem.findMany({
    where: { userId: parseInt(session.user.id) },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { productCode, source, title, imageUrl, price, currency, href } = body ?? {};
  if (!productCode || !source || !title) {
    return NextResponse.json({ error: "productCode, source, title required" }, { status: 400 });
  }
  const userId = parseInt(session.user.id);
  const item = await prisma.wishlistItem.upsert({
    where: { userId_productCode_source: { userId, productCode, source } },
    update: { title, imageUrl, price, currency, href },
    create: { userId, productCode, source, title, imageUrl, price, currency, href },
  });
  return NextResponse.json(item);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const productCode = searchParams.get("productCode");
  const source = searchParams.get("source");
  if (!productCode || !source) {
    return NextResponse.json({ error: "productCode, source required" }, { status: 400 });
  }
  const userId = parseInt(session.user.id);
  await prisma.wishlistItem.deleteMany({ where: { userId, productCode, source } });
  return NextResponse.json({ ok: true });
}
