import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/contents/:id
export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const content = await prisma.content.findUnique({
      where: { id: Number(id) },
      include: {
        destination: { select: { id: true, title: true } },
        images: {
          select: {
            id: true,
            url: true,
            key: true,
            altText: true,
            isMain: true,
            order: true,
          },
          orderBy: { order: "asc" },
        },
        _count: { select: { images: true } },
      },
    });

    if (!content) {
      return NextResponse.json(
        { error: "Content not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(content);
  } catch (error: any) {
    console.error("[GET /api/contents/:id]", error?.message);
    return NextResponse.json(
      { error: "Failed to fetch content" },
      { status: 500 }
    );
  }
}

// PUT /api/contents/:id
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const body = await req.json();
    const {
      title,
      subTitle,
      description,
      images,
      dateAvailable,
      isAvailable,
      destinationId,
    } = body;

    const content = await prisma.content.update({
      where: { id: Number(id) },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(subTitle !== undefined && {
          subTitle: subTitle?.trim() || null,
        }),
        ...(description !== undefined && {
          description: description?.trim() || null,
        }),
        ...(isAvailable !== undefined && { isAvailable }),
      },
    });

    if (images && Array.isArray(images)) {
      const existingImages = await prisma.image.findMany({
        where: { contentId: content.id },
      });

      const incomingIds = images
        .filter((img: any) => img.id)
        .map((img: any) => Number(img.id));

      // Delete removed images
      const imagesToDelete = existingImages.filter(
        (img) => !incomingIds.includes(img.id)
      );

      if (imagesToDelete.length > 0) {
        await prisma.image.deleteMany({
          where: {
            id: { in: imagesToDelete.map((img) => img.id) },
          },
        });
      }

      // Update existing images
      await Promise.all(
        images.map((image: any, index: number) => {
          if (!image.id) return;

          return prisma.image.update({
            where: { id: Number(image.id) },
            data: {
              altText: image.altText || null,
              isMain: image.isMain ?? false,
              order: image.order ?? index,
              contentId: content.id,
            },
          });
        })
      );
    }

    const updatedContent = await prisma.content.findUnique({
      where: { id: content.id },
      include: {
        destination: { select: { id: true, title: true } },
        images: {
          select: {
            id: true,
            url: true,
            key: true,
            altText: true,
            isMain: true,
            order: true,
          },
          orderBy: { order: "asc" },
        },
        _count: { select: { images: true } },
      },
    });

    return NextResponse.json(updatedContent);
  } catch (error: any) {
    console.error("[PUT /api/contents/:id]", error?.message);
    return NextResponse.json(
      { error: "Failed to update content" },
      { status: 500 }
    );
  }
}

// DELETE /api/contents/:id
export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    // Optional: delete related images first
    await prisma.image.deleteMany({
      where: { contentId: Number(id) },
    });

    await prisma.content.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/contents/:id]", error?.message);
    return NextResponse.json(
      { error: "Failed to delete content" },
      { status: 500 }
    );
  }
}