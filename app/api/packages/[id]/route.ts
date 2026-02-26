import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/packages/:id
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const pkg = await prisma.package.findUnique({
      where: { id: Number(id) },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        destination: { select: { id: true, title: true } },
        images: true,
        _count: { select: { images: true } },
      },
    });
    if (!pkg) return NextResponse.json({ error: "Package not found" }, { status: 404 });
    return NextResponse.json(pkg);
  } catch {
    return NextResponse.json({ error: "Failed to fetch package" }, { status: 500 });
  }
}

// PATCH /api/packages/:id
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const body = await req.json();
    const { title, description, price, categoryId, destinationId } = body;

    const pkg = await prisma.package.update({
      where: { id: Number(id) },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: Number(price) }),
        categoryId: categoryId !== undefined ? (categoryId ? Number(categoryId) : null) : undefined,
        destinationId: destinationId !== undefined ? (destinationId ? Number(destinationId) : null) : undefined,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        destination: { select: { id: true, title: true } },
        _count: { select: { images: true } },
      },
    });

    return NextResponse.json(pkg);
  } catch {
    return NextResponse.json({ error: "Failed to update package" }, { status: 500 });
  }
}

// DELETE /api/packages/:id
export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    await prisma.package.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete package" }, { status: 500 });
  }
}