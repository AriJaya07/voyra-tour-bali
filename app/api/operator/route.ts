import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

async function requireUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return parseInt(session.user.id);
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const op = await prisma.operator.findUnique({ where: { ownerUserId: userId } });
  return NextResponse.json(op);
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    name,
    email,
    phone,
    whatsapp,
    website,
    description,
    licenseNo,
    insurance,
    yearsActive,
  } = body ?? {};

  if (typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  if (typeof email !== "string" || !email.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) {
    return NextResponse.json({ error: "valid email required" }, { status: 400 });
  }
  if (typeof licenseNo !== "string" || licenseNo.trim().length < 2) {
    return NextResponse.json({ error: "licenseNo required" }, { status: 400 });
  }

  const existing = await prisma.operator.findUnique({ where: { ownerUserId: userId } });
  if (existing) {
    return NextResponse.json({ error: "Already applied", operator: existing }, { status: 409 });
  }

  const baseSlug = slugify(name);
  let slug = baseSlug;
  let i = 1;
  while (await prisma.operator.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${i++}`;
    if (i > 50) break;
  }

  const created = await prisma.operator.create({
    data: {
      ownerUserId: userId,
      name: name.trim().slice(0, 120),
      slug,
      email: email.trim().toLowerCase(),
      phone: typeof phone === "string" ? phone.slice(0, 30) : null,
      whatsapp: typeof whatsapp === "string" ? whatsapp.slice(0, 30) : null,
      website: typeof website === "string" ? website.slice(0, 200) : null,
      description: typeof description === "string" ? description.slice(0, 1000) : null,
      licenseNo: licenseNo.trim().slice(0, 60),
      insurance: !!insurance,
      yearsActive:
        typeof yearsActive === "number" && yearsActive >= 0 ? Math.floor(yearsActive) : 0,
      status: "PENDING",
    },
  });

  return NextResponse.json(created);
}
