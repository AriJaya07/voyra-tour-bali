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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const it = await prisma.savedItinerary.findFirst({
    where: { id: parseInt(id), userId },
  });
  if (!it) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(it);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const numId = parseInt(id);

  const existing = await prisma.savedItinerary.findFirst({ where: { id: numId, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body?.title === "string") data.title = body.title.trim().slice(0, 120);
  if (Array.isArray(body?.itemsJson)) data.itemsJson = body.itemsJson;
  if (body?.visibility === "PUBLIC" || body?.visibility === "PRIVATE") {
    data.visibility = body.visibility;
    if (body.visibility === "PUBLIC" && !existing.shareSlug) {
      data.shareSlug = crypto.randomBytes(8).toString("hex");
    }
  }

  const updated = await prisma.savedItinerary.update({ where: { id: numId }, data });
  return NextResponse.json(updated);
}
