import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const content = await prisma.content.findUnique({
      where: { id: Number(id) },
      include: { destination: { select: { id: true, title: true } } },
    });
    if (!content)
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    return NextResponse.json(content);
  } catch (error: any) {
    console.error("[GET /api/contents/:id]", error?.message);
    return NextResponse.json({ error: "Failed to fetch content" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const body = await req.json();
    const {
      title, subTitle, description,
      image1, image2, image3, image4, image5,
      imageMain, dateAvailable, isAvailable, destinationId,
    } = body;

    const content = await prisma.content.update({
      where: { id: Number(id) },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(subTitle !== undefined && { subTitle: subTitle?.trim() || null }),
        ...(description !== undefined && { description: description.trim() }),
        ...(image1 !== undefined && { image1: image1?.trim() || null }),
        ...(image2 !== undefined && { image2: image2?.trim() || null }),
        ...(image3 !== undefined && { image3: image3?.trim() || null }),
        ...(image4 !== undefined && { image4: image4?.trim() || null }),
        ...(image5 !== undefined && { image5: image5?.trim() || null }),
        ...(imageMain !== undefined && { imageMain: imageMain?.trim() || null }),
        ...(dateAvailable !== undefined && { dateAvailable: new Date(dateAvailable) }),
        ...(isAvailable !== undefined && { isAvailable }),
        ...(destinationId !== undefined && { destinationId: Number(destinationId) }),
      },
      include: { destination: { select: { id: true, title: true } } },
    });

    return NextResponse.json(content);
  } catch (error: any) {
    console.error("[PATCH /api/contents/:id]", error?.message);
    return NextResponse.json({ error: "Failed to update content" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    await prisma.content.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/contents/:id]", error?.message);
    return NextResponse.json({ error: "Failed to delete content" }, { status: 500 });
  }
}
