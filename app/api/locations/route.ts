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
  } catch (error: any) {
    console.error("Full error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to fetch locations" },
      { status: 500 }
    );
  }
}

// POST /api/locations
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, images, hrefLink, description, destinationId } = body;

    // ✅ Validation
    if (!title?.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    if (!destinationId) {
      return NextResponse.json(
        { error: "Destination is required" },
        { status: 400 }
      );
    }

    // ✅ Check destination exists
    const destination = await prisma.destination.findUnique({
      where: { id: Number(destinationId) },
    });

    if (!destination) {
      return NextResponse.json(
        { error: "Destination not found" },
        { status: 404 }
      );
    }

    // ✅ 1. Create location first
    const location = await prisma.location.create({
      data: {
        title: title.trim(),
        hrefLink: hrefLink?.trim() || null,
        description: description?.trim() || null,
        destinationId: Number(destinationId),
      },
    });

    // ✅ 2. Attach images (if any)
    if (images && Array.isArray(images) && images.length > 0) {
      await Promise.all(
        images.map((image: any, index: number) =>
          prisma.image.update({
            where: { id: Number(image.id) },
            data: {
              locationId: location.id, // 🔥 attach to location
              altText: image.altText || null,
              isMain: image.isMain ?? false,
              order: image.order ?? index,
            },
          })
        )
      );
    }

    // ✅ 3. Return full location with relations
    const fullLocation = await prisma.location.findUnique({
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

    return NextResponse.json(fullLocation, { status: 201 });
  } catch (error: any) {
    console.error("Meta:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to create location" },
      { status: 500 }
    );
  }
}