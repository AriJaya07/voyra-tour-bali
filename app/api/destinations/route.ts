import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const categoryId = req.nextUrl.searchParams.get("categoryId");

    const where = categoryId ? { categoryId: Number(categoryId) } : {};

    const destinations = await prisma.destination.findMany({
      where,
      include: {
        category: true,
        images: true,
        packages: true,
        contents: true,
        locations: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(destinations);
  } catch (error) {
    console.error("Error fetching destinations:", error);
    return NextResponse.json(
      { error: "Failed to fetch destinations" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, description, price, categoryId, slug, images, contents, locations } = body;

    if (!title || !description || price === undefined || price === null || !categoryId) {
      return NextResponse.json(
        { error: "Title, description, price, and category are required" },
        { status: 400 }
      );
    }

    // Create destination
    const destination = await prisma.destination.create({
      data: {
        title,
        description,
        price: Number(price),
        categoryId: Number(categoryId),
        slug: slug || undefined,
      },
    });

    // Handle images
    if (images && images.length > 0) {
      await Promise.all(
        images.map((image: any, index: number) =>
          prisma.image.update({
            where: { id: Number(image.id) },
            data: {
              destinationId: destination.id,
              altText: image.altText || null,
              isMain: image.isMain || false,
              order: image.order || index,
            },
          })
        )
      );
    }

    // Handle contents
    if (contents && contents.length > 0) {
      await Promise.all(
        contents.map(async (content: any) => {
          const createdContent = await prisma.content.create({
            data: {
              title: content.title,
              subTitle: content.subTitle || null,
              description: content.description,
              dateAvailable: new Date(content.dateAvailable),
              isAvailable: content.isAvailable,
              destinationId: destination.id,
            },
          });

          // Handle content images
          if (content.images && content.images.length > 0) {
            await Promise.all(
              content.images.map((image: any, index: number) =>
                prisma.image.update({
                  where: { id: Number(image.id) },
                  data: {
                    contentId: createdContent.id,
                    altText: image.altText || null,
                    isMain: image.isMain || false,
                    order: image.order || index,
                  },
                })
              )
            );
          }
        })
      );
    }

    // Handle locations
    if (locations && locations.length > 0) {
      await Promise.all(
        locations.map(async (location: any) => {
          const createdLocation = await prisma.location.create({
            data: {
              title: location.title,
              description: location.description || null,
              hrefLink: location.hrefLink || null,
              destinationId: destination.id,
            },
          });

          // Handle location images
          if (location.images && location.images.length > 0) {
            await Promise.all(
              location.images.map((image: any, index: number) =>
                prisma.image.update({
                  where: { id: Number(image.id) },
                  data: {
                    locationId: createdLocation.id,
                    altText: image.altText || null,
                    isMain: image.isMain || false,
                    order: image.order || index,
                  },
                })
              )
            );
          }
        })
      );
    }

    // Return the complete destination with relations
    const completeDestination = await prisma.destination.findUnique({
      where: { id: destination.id },
      include: {
        category: true,
        images: true,
        packages: true,
        contents: {
          include: {
            images: true,
          },
        },
        locations: {
          include: {
            images: true,
          },
        },
      },
    });

    return NextResponse.json(completeDestination, { status: 201 });
  } catch (error) {
    console.error("Error creating destination:", error);
    return NextResponse.json(
      { error: "Failed to create destination" },
      { status: 500 }
    );
  }
}
