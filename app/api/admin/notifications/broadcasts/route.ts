import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";
import {
  NOTIF_AUDIENCES,
  NOTIF_CATEGORIES,
  sendBroadcast,
} from "@/lib/services/notificationService";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.id || role !== "ADMIN") return null;
  return parseInt(session.user.id);
}

export async function GET(req: NextRequest) {
  try {
    const adminId = await requireAdmin();
    if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const status = req.nextUrl.searchParams.get("status");
    const items = await prisma.notificationBroadcast.findMany({
      where: status ? { status } : {},
      orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
      include: {
        template: { select: { id: true, key: true, title: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { notifications: true } },
      },
      take: 100,
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching broadcasts:", error);
    return NextResponse.json({ error: "Failed to fetch broadcasts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminId = await requireAdmin();
    if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action: string = typeof body?.action === "string" ? body.action : "draft"; // draft | schedule | send | test

    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const text = typeof body?.body === "string" ? body.body.trim() : "";
    const category = typeof body?.category === "string" ? body.category : "";
    const url = typeof body?.url === "string" ? body.url.trim() || null : null;
    const iconKey = typeof body?.iconKey === "string" ? body.iconKey.trim() || null : null;
    const audience = typeof body?.audience === "string" ? body.audience : "ALL";
    const audienceIdsRaw = Array.isArray(body?.audienceIds) ? body.audienceIds : [];
    const audienceIds = audienceIdsRaw
      .map((n: unknown) => Number(n))
      .filter((n: number) => Number.isFinite(n) && n > 0);
    const channelsRaw = (body?.channels ?? {}) as Record<string, unknown>;
    const channels = {
      inApp: true,
      push: !!channelsRaw.push,
      email: !!channelsRaw.email,
    };
    const scheduledAt =
      typeof body?.scheduledAt === "string" && body.scheduledAt
        ? new Date(body.scheduledAt)
        : null;
    const templateId =
      typeof body?.templateId === "number" && body.templateId > 0 ? body.templateId : null;

    if (title.length < 2 || title.length > 120) {
      return NextResponse.json({ error: "title length 2–120" }, { status: 400 });
    }
    if (text.length < 4 || text.length > 4000) {
      return NextResponse.json({ error: "body length 4–4000" }, { status: 400 });
    }
    if (!NOTIF_CATEGORIES.includes(category as (typeof NOTIF_CATEGORIES)[number])) {
      return NextResponse.json({ error: "invalid category" }, { status: 400 });
    }
    if (!NOTIF_AUDIENCES.includes(audience as (typeof NOTIF_AUDIENCES)[number])) {
      return NextResponse.json({ error: "invalid audience" }, { status: 400 });
    }
    if (audience === "USER_LIST" && audienceIds.length === 0) {
      return NextResponse.json(
        { error: "USER_LIST audience requires at least 1 user id" },
        { status: 400 }
      );
    }
    if (action === "schedule") {
      if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
        return NextResponse.json({ error: "valid scheduledAt required" }, { status: 400 });
      }
      if (scheduledAt.getTime() < Date.now() - 60_000) {
        return NextResponse.json(
          { error: "scheduledAt must be in the future" },
          { status: 400 }
        );
      }
    }

    // Test send: don't persist a broadcast — drop a notification straight to the admin.
    if (action === "test") {
      await prisma.appNotification.create({
        data: {
          userId: adminId,
          title: `[TEST] ${title}`,
          body: text,
          category,
          url,
          iconKey,
        },
      });
      return NextResponse.json({ message: "Test sent to your inbox" });
    }

    const status =
      action === "send" ? "SENDING" : action === "schedule" ? "SCHEDULED" : "DRAFT";

    const created = await prisma.notificationBroadcast.create({
      data: {
        templateId,
        title,
        body: text,
        category,
        url,
        iconKey,
        audience,
        audienceIds: audience === "USER_LIST" ? audienceIds : null,
        channels,
        scheduledAt,
        status,
        createdById: adminId,
      },
    });

    if (action === "send") {
      // Best-effort fan-out; surface errors but don't block the response.
      try {
        await sendBroadcast(created.id);
      } catch (err) {
        console.error("Error sending broadcast immediately:", err);
      }
      const refreshed = await prisma.notificationBroadcast.findUnique({
        where: { id: created.id },
      });
      return NextResponse.json(refreshed, { status: 201 });
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating broadcast:", error);
    return NextResponse.json({ error: "Failed to create broadcast" }, { status: 500 });
  }
}
