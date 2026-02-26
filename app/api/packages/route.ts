import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/packages
export async function GET() {
  try {
    const packages = await prisma.package.findMany({
      include: {
        category: { select: { id: true, name: true, slug: true } },
        destination: { select: { id: true, title: true } },
        images: { select: { id: true, url: true }, take: 1 },
        _count: { select: { images: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(packages);
  } catch {
    return NextResponse.json({ error: "Failed to fetch packages" }, { status: 500 });
  }
}

// POST /api/packages
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, price, categoryId, destinationId } = body;

    if (!title || !description || price === undefined) {
      return NextResponse.json({ error: "Title, description, and price are required" }, { status: 400 });
    }

    const pkg = await prisma.package.create({
      data: {
        title,
        description,
        price: Number(price),
        categoryId: categoryId ? Number(categoryId) : null,
        destinationId: destinationId ? Number(destinationId) : null,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        destination: { select: { id: true, title: true } },
        _count: { select: { images: true } },
      },
    });

    return NextResponse.json(pkg, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create package" }, { status: 500 });
  }
}