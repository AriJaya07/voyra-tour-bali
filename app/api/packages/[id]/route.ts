import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/packages/:id
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const pkg = await prisma.package.findUnique({
      where: { id: Number(id) },
      include: {
        category: { select: { id: true, name: true, slug: true } },
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

    if (!pkg) {
      return NextResponse.json(
        { error: "Package not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(pkg);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch package" },
      { status: 500 }
    );
  }
}

// PUT /api/packages/:id
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const body = await req.json();
    const {
      title,
      slug,
      description,
      price,
      categoryId,
      destinationId,
      images,
    } = body;

    const pkg = await prisma.package.update({
      where: { id: Number(id) },
      data: {
        ...(title !== undefined && { title }),
        ...(slug !== undefined && { slug }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: Number(price) }),
        categoryId:
          categoryId !== undefined
            ? categoryId
              ? Number(categoryId)
              : null
            : undefined,
        destinationId:
          destinationId !== undefined
            ? destinationId
              ? Number(destinationId)
              : null
            : undefined,
      },
    });

    if (images && Array.isArray(images)) {
      // Remove images not included anymore
      const existingImages = await prisma.image.findMany({
        where: { packageId: pkg.id },
      });

      const incomingIds = images
        .filter((img: any) => img.id)
        .map((img: any) => Number(img.id));

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
            },
          });
        })
      );
    }

    const updatedPackage = await prisma.package.findUnique({
      where: { id: pkg.id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
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

    return NextResponse.json(updatedPackage);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update package" },
      { status: 500 }
    );
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