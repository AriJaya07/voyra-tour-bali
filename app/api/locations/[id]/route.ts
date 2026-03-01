import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/locations/:id
export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const location = await prisma.location.findUnique({
      where: { id: Number(id) },
      include: { destination: { select: { id: true, title: true } } },
    });
    if (!location) return NextResponse.json({ error: "Location not found" }, { status: 404 });
    return NextResponse.json(location);
  } catch {
    return NextResponse.json({ error: "Failed to fetch location" }, { status: 500 });
  }
}

// PATCH /api/locations/:id
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const body = await req.json();
    const { title, image, hrefLink, description, destinationId } = body;

    const location = await prisma.location.update({
      where: { id: Number(id) },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(image !== undefined && { image: image?.trim() || null }),
        ...(hrefLink !== undefined && { hrefLink: hrefLink?.trim() || null }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(destinationId !== undefined && { destinationId: Number(destinationId) }),
      },
      include: { destination: { select: { id: true, title: true } } },
    });

    return NextResponse.json(location);
  } catch {
    return NextResponse.json({ error: "Failed to update location" }, { status: 500 });
  }
}

// DELETE /api/locations/:id
export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    await prisma.location.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete location" }, { status: 500 });
  }
}
