import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const COOKIE_TTL_SECONDS = 24 * 60 * 60;

function cookieName(slug: string) {
  // Cookie names cannot contain unsafe chars; hash by length-bounded slug.
  return `vg_v_${slug.replace(/[^a-z0-9_-]/gi, "_").slice(0, 64)}`;
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    if (!slug || typeof slug !== "string") {
      return NextResponse.json({ error: "Bad slug" }, { status: 400 });
    }

    const guide = await prisma.guide.findUnique({
      where: { slug },
      select: { id: true, status: true },
    });
    if (!guide || guide.status !== "PUBLISHED") {
      return NextResponse.json({ counted: false }, { status: 200 });
    }

    const name = cookieName(slug);
    const seen = _req.cookies.get(name)?.value === "1";
    if (seen) return NextResponse.json({ counted: false });

    await prisma.guide.update({
      where: { id: guide.id },
      data: { views: { increment: 1 } },
    });

    const res = NextResponse.json({ counted: true });
    res.cookies.set(name, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: COOKIE_TTL_SECONDS,
      path: "/",
    });
    return res;
  } catch (error) {
    console.error("Error counting guide view:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
