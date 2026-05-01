import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

async function requireUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return parseInt(session.user.id);
}

const TARGET_TYPES = ["tour", "destination", "place"];
const VISIBILITY = ["PRIVATE", "PUBLIC"];

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.baliNote.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { targetType, targetKey, targetTitle, rating, body: noteBody, visibility, photos } = body ?? {};

  if (!TARGET_TYPES.includes(targetType)) {
    return NextResponse.json({ error: "invalid targetType" }, { status: 400 });
  }
  if (typeof targetKey !== "string" || !targetKey.trim()) {
    return NextResponse.json({ error: "targetKey required" }, { status: 400 });
  }
  if (typeof noteBody !== "string" || noteBody.trim().length < 4) {
    return NextResponse.json({ error: "body too short (min 4 chars)" }, { status: 400 });
  }

  const safeRating =
    typeof rating === "number" && rating >= 1 && rating <= 5 ? Math.floor(rating) : null;
  const safeVisibility = VISIBILITY.includes(visibility) ? visibility : "PRIVATE";

  const created = await prisma.baliNote.create({
    data: {
      userId,
      targetType,
      targetKey: targetKey.trim().slice(0, 200),
      targetTitle: typeof targetTitle === "string" ? targetTitle.slice(0, 200) : null,
      rating: safeRating,
      body: noteBody.trim().slice(0, 4000),
      photos: Array.isArray(photos) ? photos.slice(0, 6) : undefined,
      visibility: safeVisibility,
    },
  });
  return NextResponse.json(created);
}

export async function PATCH(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "0");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await prisma.baliNote.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body?.body === "string" && body.body.trim().length >= 4) data.body = body.body.trim().slice(0, 4000);
  if (typeof body?.rating === "number" && body.rating >= 1 && body.rating <= 5) data.rating = Math.floor(body.rating);
  if (VISIBILITY.includes(body?.visibility)) data.visibility = body.visibility;
  if (typeof body?.targetTitle === "string") data.targetTitle = body.targetTitle.slice(0, 200);

  const updated = await prisma.baliNote.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "0");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.baliNote.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
