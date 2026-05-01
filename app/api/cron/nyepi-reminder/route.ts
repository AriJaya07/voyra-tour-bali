import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Annual reminder for Nyepi (Day of Silence — full island shutdown ~24h).
 * Fires when run within 14 days of Nyepi date for users opted-in.
 *
 * Nyepi follows the Saka lunar calendar. Hardcode known dates; refresh annually.
 */
const NYEPI_DATES = [
  "2026-03-19", // Nyepi 2026
  "2027-03-09", // Nyepi 2027
  "2028-03-26", // Nyepi 2028
];

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const secret = process.env.CRON_SECRET || "default_secret";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = NYEPI_DATES.map((d) => new Date(d)).find((d) => {
    const diffDays = Math.round((d.getTime() - today.getTime()) / (24 * 3600 * 1000));
    return diffDays >= 0 && diffDays <= 14;
  });

  if (!upcoming) {
    return NextResponse.json({ ok: true, fired: false, note: "Not within 14 days of Nyepi" });
  }

  const optedIn = await prisma.notificationPref.count({
    where: { nyepiAlert: true },
  });

  // TODO: send email batch via lib/email
  return NextResponse.json({
    ok: true,
    fired: true,
    nyepiDate: upcoming.toISOString().slice(0, 10),
    eligibleUsers: optedIn,
    note: "Email send not yet wired. Stub returns audience size only.",
  });
}
