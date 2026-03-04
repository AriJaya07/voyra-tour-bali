import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/packages
export async function GET() {
  try {
    const packages = await prisma.package.findMany({
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(packages);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch packages" },
      { status: 500 }
    );
  }
}

// POST /api/packages
export async function POST(req: NextRequest) {
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

    if (!title || !slug || !description || price === undefined) {
      return NextResponse.json(
        { error: "Title, slug, description, and price are required" },
        { status: 400 }
      );
    }

    const pkg = await prisma.package.create({
      data: {
        title,
        slug, 
        description,
        price: Number(price),
        categoryId: categoryId ? Number(categoryId) : null,
        destinationId: destinationId ? Number(destinationId) : null,
      },
    });

    if (images && images.length > 0) {
      await Promise.all(
        images.map((image: any, index: number) =>
          prisma.image.update({
            where: { id: Number(image.id) },
            data: {
              packageId: pkg.id,
              altText: image.altText || null,
              isMain: image.isMain ?? false,
              order: image.order ?? index,
            },
          })
        )
      );
    }

    // ✅ 3. Return full package with relations
    const fullPackage = await prisma.package.findUnique({
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

    return NextResponse.json(fullPackage, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create package" },
      { status: 500 }
    );
  }
}