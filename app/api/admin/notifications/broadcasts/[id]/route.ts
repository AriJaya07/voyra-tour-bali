import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

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
  const item = await prisma.notificationBroadcast.findUnique({
    where: { id },
    include: {
      template: { select: { id: true, key: true, title: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { notifications: true } },
    },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminId = await requireAdmin();
    if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const existing = await prisma.notificationBroadcast.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.status === "SENT" || existing.status === "SENDING") {
      return NextResponse.json(
        { error: "Cannot edit a broadcast that has already been sent or is sending." },
        { status: 400 }
      );
    }
    const body = await req.json().catch(() => ({}));
    const data: Record<string, unknown> = {};
    if (typeof body?.title === "string") data.title = body.title.trim().slice(0, 120);
    if (typeof body?.body === "string") data.body = body.body.trim().slice(0, 4000);
    if (typeof body?.category === "string") data.category = body.category;
    if ("url" in body) data.url = body.url ? String(body.url).trim() : null;
    if ("scheduledAt" in body) {
      data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    }
    if (body?.cancel) data.status = "CANCELLED";
    const updated = await prisma.notificationBroadcast.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating broadcast:", error);
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
    await prisma.notificationBroadcast.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("Error deleting broadcast:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
