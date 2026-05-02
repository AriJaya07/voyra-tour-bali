import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  return session?.user?.id && role === "ADMIN" ? parseInt(session.user.id) : null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const numId = parseInt(id);

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body?.title === "string") data.title = body.title.trim().slice(0, 200);
  if (typeof body?.excerpt === "string") data.excerpt = body.excerpt.slice(0, 500);
  if (typeof body?.body === "string" && body.body.length >= 50) data.body = body.body;
  if (typeof body?.coverImage === "string") data.coverImage = body.coverImage.slice(0, 500);
  if (typeof body?.region === "string") data.region = body.region.slice(0, 60);
  if (Array.isArray(body?.tags)) data.tags = body.tags.filter((t: unknown) => typeof t === "string").slice(0, 10);
  if (body?.status === "PUBLISHED" || body?.status === "DRAFT") {
    data.status = body.status;
    if (body.status === "PUBLISHED") {
      const existing = await prisma.guide.findUnique({ where: { id: numId } });
      if (existing && !existing.publishedAt) data.publishedAt = new Date();
    }
  }

  const updated = await prisma.guide.update({ where: { id: numId }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await prisma.guide.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ ok: true });
}
