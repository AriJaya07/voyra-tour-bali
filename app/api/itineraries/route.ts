import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

async function requireUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return parseInt(session.user.id);
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = await prisma.savedItinerary.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      fromDate: true,
      toDate: true,
      visibility: true,
      shareSlug: true,
      createdAt: true,
    },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { title, fromDate, toDate, party, itemsJson, visibility } = body ?? {};

  if (typeof title !== "string" || title.trim().length < 2) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }
  if (!Array.isArray(itemsJson)) {
    return NextResponse.json({ error: "itemsJson required" }, { status: 400 });
  }

  const safeVisibility = visibility === "PUBLIC" ? "PUBLIC" : "PRIVATE";
  const shareSlug = safeVisibility === "PUBLIC" ? crypto.randomBytes(8).toString("hex") : null;

  const created = await prisma.savedItinerary.create({
    data: {
      userId,
      title: title.trim().slice(0, 120),
      fromDate: fromDate ? new Date(fromDate) : null,
      toDate: toDate ? new Date(toDate) : null,
      party: party ?? null,
      itemsJson,
      visibility: safeVisibility,
      shareSlug,
    },
  });
  return NextResponse.json(created);
}

export async function DELETE(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "0");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.savedItinerary.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
