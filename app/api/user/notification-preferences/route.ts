import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

async function requireUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return parseInt(session.user.id);
}

const DEFAULTS = {
  weatherAlerts: false,
  volcanoAlerts: true,
  nyepiAlert: true,
  tripReminders: true,
  calendarReminders: true,
  marketingEmails: false,
};

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const prefs = await prisma.notificationPref.findUnique({ where: { userId } });
  return NextResponse.json(prefs ?? { userId, ...DEFAULTS });
}

export async function PUT(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const data = {
    weatherAlerts: !!body?.weatherAlerts,
    volcanoAlerts: !!body?.volcanoAlerts,
    nyepiAlert: !!body?.nyepiAlert,
    tripReminders: !!body?.tripReminders,
    calendarReminders: body?.calendarReminders === undefined ? true : !!body.calendarReminders,
    marketingEmails: !!body?.marketingEmails,
  };

  const saved = await prisma.notificationPref.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
  return NextResponse.json(saved);
}
