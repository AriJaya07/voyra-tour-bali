import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import { NOTIF_CATEGORIES } from "@/lib/services/notificationService";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.id || role !== "ADMIN") return null;
  return parseInt(session.user.id);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id: idStr } = await params;
  const id = parseInt(idStr);
  const item = await prisma.notificationTemplate.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminId = await requireAdmin();
    if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const body = await req.json().catch(() => ({}));

    const data: Record<string, unknown> = {};
    if (typeof body?.title === "string") {
      const t = body.title.trim();
      if (t.length < 2 || t.length > 120)
        return NextResponse.json({ error: "title length 2–120" }, { status: 400 });
      data.title = t;
    }
    if (typeof body?.body === "string") {
      const t = body.body.trim();
      if (t.length < 4 || t.length > 4000)
        return NextResponse.json({ error: "body length 4–4000" }, { status: 400 });
      data.body = t;
    }
    if (typeof body?.category === "string") {
      if (!NOTIF_CATEGORIES.includes(body.category as (typeof NOTIF_CATEGORIES)[number]))
        return NextResponse.json({ error: "invalid category" }, { status: 400 });
      data.category = body.category;
    }
    if ("url" in body) data.url = body.url ? String(body.url).trim() : null;
    if ("iconKey" in body) data.iconKey = body.iconKey ? String(body.iconKey).trim() : null;
    if ("archived" in body) data.archivedAt = body.archived ? new Date() : null;

    const updated = await prisma.notificationTemplate.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating notification template:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminId = await requireAdmin();
    if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    await prisma.notificationTemplate.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("Error deleting notification template:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
