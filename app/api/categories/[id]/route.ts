import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/categories/:id
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const category = await prisma.category.findUnique({
      where: { id: Number(id) },
      include: {
        destinations: true,
        packages: true,
        _count: { select: { destinations: true, packages: true } },
      },
    });
    if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(category);
  } catch {
    return NextResponse.json({ error: "Failed to fetch category" }, { status: 500 });
  }
}

// PATCH /api/categories/:id
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const body = await req.json();
    const { name, slug, description } = body;

    if (slug) {
      const existing = await prisma.category.findFirst({
        where: { slug, NOT: { id: Number(id) } },
      });
      if (existing) {
        return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
      }
    }

    const category = await prisma.category.update({
      where: { id: Number(id) },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        description: description ?? undefined,
      },
    });

    return NextResponse.json(category);
  } catch {
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

// DELETE /api/categories/:id
export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    await prisma.category.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}