import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

const MAX_ITEMS = 12;
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function cutoff() {
  return new Date(Date.now() - TTL_MS);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);
  const items = await prisma.recentlyViewedItem.findMany({
    where: {
      userId,
      viewedAt: { gte: cutoff() },
    },
    orderBy: { viewedAt: "desc" },
    take: MAX_ITEMS,
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const { productCode, source, title, imageUrl, price, currency, href } = body ?? {};
  if (!productCode || !source || !title) {
    return NextResponse.json({ error: "productCode, source, title required" }, { status: 400 });
  }
  const userId = parseInt(session.user.id);
  const now = new Date();

  await prisma.recentlyViewedItem.upsert({
    where: { userId_productCode_source: { userId, productCode, source } },
    update: { title, imageUrl, price, currency, href, viewedAt: now },
    create: { userId, productCode, source, title, imageUrl, price, currency, href, viewedAt: now },
  });

  // Drop expired (>24h) for this user
  await prisma.recentlyViewedItem.deleteMany({
    where: { userId, viewedAt: { lt: cutoff() } },
  });

  // Trim to MAX_ITEMS most-recent (after expiry sweep)
  const all = await prisma.recentlyViewedItem.findMany({
    where: { userId },
    orderBy: { viewedAt: "desc" },
    select: { id: true },
  });
  const stale = all.slice(MAX_ITEMS).map((r) => r.id);
  if (stale.length) {
    await prisma.recentlyViewedItem.deleteMany({ where: { id: { in: stale } } });
  }

  return NextResponse.json({ ok: true });
}
