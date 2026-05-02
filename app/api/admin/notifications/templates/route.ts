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

export async function GET() {
  try {
    const adminId = await requireAdmin();
    if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const items = await prisma.notificationTemplate.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { broadcasts: true } },
      },
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching notification templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminId = await requireAdmin();
    if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const key = typeof body?.key === "string" ? body.key.trim().toLowerCase() : "";
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const text = typeof body?.body === "string" ? body.body.trim() : "";
    const category = typeof body?.category === "string" ? body.category : "";
    const url = typeof body?.url === "string" ? body.url.trim() || null : null;
    const iconKey = typeof body?.iconKey === "string" ? body.iconKey.trim() || null : null;

    if (!/^[a-z0-9-]{2,80}$/.test(key)) {
      return NextResponse.json(
        { error: "key must be lowercase a-z, 0-9, '-' (2–80 chars)" },
        { status: 400 }
      );
    }
    if (title.length < 2 || title.length > 120) {
      return NextResponse.json({ error: "title length 2–120" }, { status: 400 });
    }
    if (text.length < 4 || text.length > 4000) {
      return NextResponse.json({ error: "body length 4–4000" }, { status: 400 });
    }
    if (!NOTIF_CATEGORIES.includes(category as (typeof NOTIF_CATEGORIES)[number])) {
      return NextResponse.json({ error: "invalid category" }, { status: 400 });
    }

    const created = await prisma.notificationTemplate.create({
      data: {
        key,
        title,
        body: text,
        category,
        url,
        iconKey,
        createdById: adminId,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating notification template:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}
