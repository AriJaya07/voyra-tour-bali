import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

import { parseRRule } from "@/lib/calendar/recurrence";

const COLORS = ["blue", "green", "purple", "red", "amber"];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const VISIBILITY = ["PRIVATE", "PUBLIC"];

async function requireUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return parseInt(session.user.id);
}

function parseDateOnly(input: unknown): Date | null {
  if (typeof input !== "string") return null;
  const m = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(Date.UTC(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}

function sanitizeBody(input: unknown) {
  const body = (input ?? {}) as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 120) : "";
  const date = parseDateOnly(body.date);
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 2000) : null;
  const startTime =
    typeof body.startTime === "string" && TIME_RE.test(body.startTime) ? body.startTime : null;
  const endTime =
    typeof body.endTime === "string" && TIME_RE.test(body.endTime) ? body.endTime : null;
  const location =
    typeof body.location === "string" ? body.location.trim().slice(0, 200) || null : null;
  const color =
    typeof body.color === "string" && COLORS.includes(body.color) ? body.color : "blue";
  const noteId =
    typeof body.noteId === "number" && Number.isFinite(body.noteId) && body.noteId > 0
      ? Math.floor(body.noteId)
      : null;
  const recurrenceRaw = typeof body.recurrence === "string" ? body.recurrence.trim() : "";
  const recurrence = recurrenceRaw && parseRRule(recurrenceRaw) ? recurrenceRaw : null;
  const recurrenceUntil = body.recurrenceUntil ? parseDateOnly(body.recurrenceUntil) : null;
  const visibility =
    typeof body.visibility === "string" && VISIBILITY.includes(body.visibility)
      ? body.visibility
      : "PRIVATE";
  return {
    title,
    date,
    notes,
    startTime,
    endTime,
    location,
    color,
    noteId,
    recurrence,
    recurrenceUntil,
    visibility,
  };
}

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fromRaw = searchParams.get("from");
  const toRaw = searchParams.get("to");
  const from = fromRaw ? parseDateOnly(fromRaw) : null;
  const to = toRaw ? parseDateOnly(toRaw) : null;

  const items = await prisma.calendarEvent.findMany({
    where: {
      userId,
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    include: {
      baliNote: { select: { id: true, targetTitle: true, targetType: true, rating: true } },
    },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await req.json().catch(() => ({}));
  const data = sanitizeBody(raw);

  if (data.title.length < 2) {
    return NextResponse.json({ error: "Title must be at least 2 characters" }, { status: 400 });
  }
  if (!data.date) {
    return NextResponse.json({ error: "Valid date is required" }, { status: 400 });
  }
  if (data.startTime && data.endTime && data.endTime < data.startTime) {
    return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
  }

  if (data.noteId) {
    const owns = await prisma.baliNote.findFirst({
      where: { id: data.noteId, userId },
      select: { id: true },
    });
    if (!owns) data.noteId = null;
  }

  const created = await prisma.calendarEvent.create({
    data: {
      userId,
      title: data.title,
      date: data.date,
      notes: data.notes,
      startTime: data.startTime,
      endTime: data.endTime,
      location: data.location,
      color: data.color,
      noteId: data.noteId,
      recurrence: data.recurrence,
      recurrenceUntil: data.recurrenceUntil,
      visibility: data.visibility,
    },
    include: {
      baliNote: { select: { id: true, targetTitle: true, targetType: true, rating: true } },
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

  const existing = await prisma.calendarEvent.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const raw = await req.json().catch(() => ({}));
  const incoming = sanitizeBody(raw);
  const update: Record<string, unknown> = {};

  if (typeof raw?.title === "string") {
    if (incoming.title.length < 2)
      return NextResponse.json({ error: "Title must be at least 2 characters" }, { status: 400 });
    update.title = incoming.title;
  }
  if (typeof raw?.date === "string") {
    if (!incoming.date) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    update.date = incoming.date;
  }
  if ("notes" in raw) update.notes = incoming.notes;
  if ("startTime" in raw) update.startTime = incoming.startTime;
  if ("endTime" in raw) update.endTime = incoming.endTime;
  if ("location" in raw) update.location = incoming.location;
  if ("color" in raw) update.color = incoming.color;
  if ("noteId" in raw) {
    if (incoming.noteId) {
      const owns = await prisma.baliNote.findFirst({
        where: { id: incoming.noteId, userId },
        select: { id: true },
      });
      update.noteId = owns ? incoming.noteId : null;
    } else {
      update.noteId = null;
    }
  }
  if ("recurrence" in raw) {
    update.recurrence = incoming.recurrence;
    // Reset reminder when series changes so next occurrence gets notified.
    update.reminderSent = false;
  }
  if ("recurrenceUntil" in raw) update.recurrenceUntil = incoming.recurrenceUntil;
  if ("visibility" in raw) update.visibility = incoming.visibility;
  if ("date" in raw) update.reminderSent = false;

  const finalStart =
    "startTime" in update ? (update.startTime as string | null) : existing.startTime;
  const finalEnd = "endTime" in update ? (update.endTime as string | null) : existing.endTime;
  if (finalStart && finalEnd && finalEnd < finalStart) {
    return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
  }

  const updated = await prisma.calendarEvent.update({
    where: { id },
    data: update,
    include: {
      baliNote: { select: { id: true, targetTitle: true, targetType: true, rating: true } },
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "0");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.calendarEvent.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
