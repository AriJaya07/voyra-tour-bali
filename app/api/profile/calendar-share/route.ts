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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { calendarShareSlug: true, calendarShareEnabled: true },
  });
  return NextResponse.json({
    enabled: !!user?.calendarShareEnabled,
    slug: user?.calendarShareSlug ?? null,
  });
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const enable = !!body?.enabled;

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { calendarShareSlug: true },
  });

  let slug = existing?.calendarShareSlug ?? null;
  if (enable && !slug) {
    slug = crypto.randomBytes(8).toString("hex");
  } else if (!enable) {
    slug = null;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      calendarShareEnabled: enable,
      calendarShareSlug: slug,
    },
    select: { calendarShareEnabled: true, calendarShareSlug: true },
  });

  return NextResponse.json({
    enabled: updated.calendarShareEnabled,
    slug: updated.calendarShareSlug,
  });
}

export async function DELETE() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rotate slug + disable.
  const newSlug = crypto.randomBytes(8).toString("hex");
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { calendarShareEnabled: false, calendarShareSlug: newSlug },
    select: { calendarShareEnabled: true, calendarShareSlug: true },
  });
  return NextResponse.json({
    enabled: updated.calendarShareEnabled,
    slug: updated.calendarShareSlug,
  });
}
