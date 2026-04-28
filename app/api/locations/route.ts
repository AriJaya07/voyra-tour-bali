import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/locations
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const destinationId = searchParams.get("destinationId");

    const locations = await prisma.location.findMany({
      where: destinationId
        ? { destinationId: Number(destinationId) }
        : undefined,
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(locations);
  } catch (error) {
    console.error("Error fetching locations:", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}

interface LocationImageInput {
  id: number | string;
  altText?: string | null;
  isMain?: boolean;
  order?: number;
}

// POST /api/locations
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      images,
      hrefLink,
      description,
      destinationId,
    }: {
      title: string;
      images?: LocationImageInput[];
      hrefLink?: string;
      description?: string;
      destinationId: number | string;
    } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (!destinationId) {
      return NextResponse.json(
        { error: "Destination is required" },
        { status: 400 }
      );
    }

    const destination = await prisma.destination.findUnique({
      where: { id: Number(destinationId) },
    });

    if (!destination) {
      return NextResponse.json(
        { error: "Destination not found" },
        { status: 404 }
      );
    }

    const locationId = await prisma.$transaction(async (tx) => {
      const location = await tx.location.create({
        data: {
          title: title.trim(),
          hrefLink: hrefLink?.trim() || null,
          description: description?.trim() || null,
          destinationId: Number(destinationId),
        },
      });

      if (images && Array.isArray(images) && images.length > 0) {
        await Promise.all(
          images.map((image, index) =>
            tx.image.update({
              where: { id: Number(image.id) },
              data: {
                locationId: location.id,
                altText: image.altText || null,
                isMain: image.isMain ?? false,
                order: image.order ?? index,
              },
            })
          )
        );
      }

      return location.id;
    });

    const fullLocation = await prisma.location.findUnique({
      where: { id: locationId },
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

    return NextResponse.json(fullLocation, { status: 201 });
  } catch (error) {
    console.error("Error creating location:", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json(
      { error: "Failed to create location" },
      { status: 500 }
    );
  }
}