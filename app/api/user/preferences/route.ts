import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

const STYLE_TAGS = [
  "adventure",
  "culture",
  "food",
  "wellness",
  "family",
  "luxury",
  "budget",
  "nightlife",
  "nature",
  "beach",
  "diving",
  "surf",
];

const REGIONS = ["Ubud", "Canggu", "Seminyak", "Kuta", "Sanur", "Nusa Dua", "Uluwatu", "Lovina", "Amed", "Nusa Penida"];

async function requireUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return parseInt(session.user.id);
}

const DEFAULTS = {
  partyAdults: 2,
  partyChildren: 0,
  partySeniors: 0,
  partyInfants: 0,
  styleTags: [] as string[],
  dietary: null,
  mobility: null,
  regionPref: null,
  tripLengthDays: null,
};

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prefs = await prisma.userPreferences.findUnique({ where: { userId } });
  return NextResponse.json(prefs ?? { userId, ...DEFAULTS });
}

function clampInt(v: unknown, min: number, max: number, fallback: number) {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

export async function PUT(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const styleTags: string[] = Array.isArray(body?.styleTags)
    ? body.styleTags.filter((t: unknown) => typeof t === "string" && STYLE_TAGS.includes(t))
    : [];
  const regionPref =
    typeof body?.regionPref === "string" && REGIONS.includes(body.regionPref) ? body.regionPref : null;

  const data = {
    partyAdults: clampInt(body?.partyAdults, 0, 20, DEFAULTS.partyAdults),
    partyChildren: clampInt(body?.partyChildren, 0, 20, 0),
    partySeniors: clampInt(body?.partySeniors, 0, 20, 0),
    partyInfants: clampInt(body?.partyInfants, 0, 20, 0),
    styleTags,
    dietary: typeof body?.dietary === "string" ? body.dietary.slice(0, 200) || null : null,
    mobility: typeof body?.mobility === "string" ? body.mobility.slice(0, 200) || null : null,
    regionPref,
    tripLengthDays:
      typeof body?.tripLengthDays === "number" && body.tripLengthDays > 0 && body.tripLengthDays < 60
        ? Math.floor(body.tripLengthDays)
        : null,
  };

  const saved = await prisma.userPreferences.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
  return NextResponse.json(saved);
}
