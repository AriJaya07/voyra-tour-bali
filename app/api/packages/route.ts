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
    console.error("Error fetching packages:", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json(
      { error: "Failed to fetch packages" },
      { status: 500 }
    );
  }
}

interface PackageImageInput {
  id: number | string;
  altText?: string | null;
  isMain?: boolean;
  order?: number;
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
    }: {
      title: string;
      slug: string;
      description: string;
      price: number | string;
      categoryId?: number | string | null;
      destinationId?: number | string | null;
      images?: PackageImageInput[];
    } = body;

    if (!title || !slug || !description || price === undefined) {
      return NextResponse.json(
        { error: "Title, slug, description, and price are required" },
        { status: 400 }
      );
    }

    const packageId = await prisma.$transaction(async (tx) => {
      const pkg = await tx.package.create({
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
          images.map((image, index) =>
            tx.image.update({
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

      return pkg.id;
    });

    const fullPackage = await prisma.package.findUnique({
      where: { id: packageId },
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
    console.error("Error creating package:", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json(
      { error: "Failed to create package" },
      { status: 500 }
    );
  }
}