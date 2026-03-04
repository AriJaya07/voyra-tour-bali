import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/locations/:id
export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const location = await prisma.location.findUnique({
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

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(location);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch location" },
      { status: 500 }
    );
  }
}

// PATCH /api/locations/:id
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const body = await req.json();
    const { title, images, hrefLink, description, destinationId } = body;

    const location = await prisma.location.update({
      where: { id: Number(id) },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(hrefLink !== undefined && {
          hrefLink: hrefLink?.trim() || null,
        }),
        ...(description !== undefined && {
          description: description?.trim() || null,
        }),
      },
    });

    if (images && Array.isArray(images)) {
      const existingImages = await prisma.image.findMany({
        where: { locationId: location.id },
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

      await Promise.all(
        images.map((image: any, index: number) => {
          if (!image.id) return;

          return prisma.image.update({
            where: { id: Number(image.id) },
            data: {
              altText: image.altText || null,
              isMain: image.isMain ?? false,
              order: image.order ?? index,
              locationId: location.id,
            },
          });
        })
      );
    }

    const updatedLocation = await prisma.location.findUnique({
      where: { id: location.id },
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

    return NextResponse.json(updatedLocation);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update location" },
      { status: 500 }
    );
  }
}

// DELETE /api/locations/:id
export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    await prisma.image.deleteMany({
      where: { locationId: Number(id) },
    });

    await prisma.location.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete location" },
      { status: 500 }
    );
  }
}