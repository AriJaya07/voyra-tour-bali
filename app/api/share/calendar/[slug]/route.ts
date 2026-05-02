import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const user = await prisma.user.findUnique({
    where: { calendarShareSlug: slug },
    select: {
      id: true,
      name: true,
      calendarShareEnabled: true,
    },
  });
  if (!user || !user.calendarShareEnabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const events = await prisma.calendarEvent.findMany({
    where: { userId: user.id, visibility: "PUBLIC" },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    select: {
      id: true,
      title: true,
      notes: true,
      date: true,
      startTime: true,
      endTime: true,
      location: true,
      color: true,
      recurrence: true,
      recurrenceUntil: true,
    },
  });

  return NextResponse.json({
    owner: { name: user.name || "Traveler" },
    events,
  });
}
