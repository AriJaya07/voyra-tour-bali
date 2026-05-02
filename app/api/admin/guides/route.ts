import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") return null;
  return parseInt(session.user.id);
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

export async function GET() {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const guides = await prisma.guide.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json(guides);
}

export async function POST(req: NextRequest) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { title, excerpt, body: content, coverImage, region, tags, status } = body ?? {};

  if (typeof title !== "string" || title.trim().length < 4) {
    return NextResponse.json({ error: "title required (min 4)" }, { status: 400 });
  }
  if (typeof content !== "string" || content.trim().length < 50) {
    return NextResponse.json({ error: "body required (min 50 chars)" }, { status: 400 });
  }

  const baseSlug = slugify(title);
  let slug = baseSlug;
  let i = 1;
  while (await prisma.guide.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${i++}`;
    if (i > 50) break;
  }

  const safeStatus = status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";

  const created = await prisma.guide.create({
    data: {
      slug,
      title: title.trim().slice(0, 200),
      excerpt: typeof excerpt === "string" ? excerpt.slice(0, 500) : title.slice(0, 200),
      body: content,
      coverImage: typeof coverImage === "string" ? coverImage.slice(0, 500) : null,
      region: typeof region === "string" ? region.slice(0, 60) : null,
      tags: Array.isArray(tags) ? tags.filter((t) => typeof t === "string").slice(0, 10) : [],
      status: safeStatus,
      publishedAt: safeStatus === "PUBLISHED" ? new Date() : null,
    },
  });

  return NextResponse.json(created);
}
