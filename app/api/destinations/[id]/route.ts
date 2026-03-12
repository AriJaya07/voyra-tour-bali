import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET /api/destinations/:id
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const data = await prisma.destination.findUnique({
      where: { id: Number(id) },
    });
  
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching destination:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PUT /api/destinations/:id
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await request.json();
  const { title, description, price, categoryId, slug, images, contents, locations } = body;

  try {
    await prisma.destination.update({
      where: { id: Number(id) },
      data: {
        title,
        description,
        price: Number(price),
        categoryId: Number(categoryId),
        slug: slug || null,
      },
    });

    if (images && images.length > 0) {
      await Promise.all(
        images
          .filter((image: any) => image.id) // Only update images that have an ID
          .map((image: any) =>
            prisma.image.update({
              where: { id: Number(image.id) },
              data: {
                destinationId: Number(id),
                altText: image.altText || null,
                isMain: image.isMain || false,
                order: image.order || 0,
              },
            })
          )
      );
    }

    // Handle contents - update existing or create new ones
    if (contents && contents.length > 0) {
      for (const content of contents) {
        if (content.id) {
          // Update existing content
          await prisma.content.update({
            where: { id: Number(content.id) },
            data: {
              title: content.title,
              subTitle: content.subTitle || null,
              description: content.description,
              dateAvailable: new Date(content.dateAvailable),
              isAvailable: content.isAvailable,
            },
          });

          // Update content images
          if (content.images && content.images.length > 0) {
            await Promise.all(
              content.images.map((image: any) =>
                prisma.image.update({
                  where: { id: Number(image.id) },
                  data: {
                    contentId: Number(content.id),
                    altText: image.altText || null,
                    isMain: image.isMain || false,
                    order: image.order || 0,
                  },
                })
              )
            );
          }
        } else {
          // Create new content
          const createdContent = await prisma.content.create({
            data: {
              title: content.title,
              subTitle: content.subTitle || null,
              description: content.description,
              dateAvailable: new Date(content.dateAvailable),
              isAvailable: content.isAvailable,
              destinationId: Number(id),
            },
          });

          // Handle new content images
          if (content.images && content.images.length > 0) {
            await Promise.all(
              content.images.map((image: any) =>
                prisma.image.update({
                  where: { id: Number(image.id) },
                  data: {
                    contentId: createdContent.id,
                    altText: image.altText || null,
                    isMain: image.isMain || false,
                    order: image.order || 0,
                  },
                })
              )
            );
          }
        }
      }
    }

    // Handle locations - update existing or create new ones
    if (locations && locations.length > 0) {
      for (const location of locations) {
        if (location.id) {
          // Update existing location
          await prisma.location.update({
            where: { id: Number(location.id) },
            data: {
              title: location.title,
              description: location.description || null,
              hrefLink: location.hrefLink || null,
            },
          });

          // Update location images
          if (location.images && location.images.length > 0) {
            await Promise.all(
              location.images.map((image: any) =>
                prisma.image.update({
                  where: { id: Number(image.id) },
                  data: {
                    locationId: Number(location.id),
                    altText: image.altText || null,
                    isMain: image.isMain || false,
                    order: image.order || 0,
                  },
                })
              )
            );
          }
        } else {
          // Create new location
          const createdLocation = await prisma.location.create({
            data: {
              title: location.title,
              description: location.description || null,
              hrefLink: location.hrefLink || null,
              destinationId: Number(id),
            },
          });

          // Handle new location images
          if (location.images && location.images.length > 0) {
            await Promise.all(
              location.images.map((image: any) =>
                prisma.image.update({
                  where: { id: Number(image.id) },
                  data: {
                    locationId: createdLocation.id,
                    altText: image.altText || null,
                    isMain: image.isMain || false,
                    order: image.order || 0,
                  },
                })
              )
            );
          }
        }
      }
    }

    // Return the complete updated destination with relations
    const completeDestination = await prisma.destination.findUnique({
      where: { id: Number(id) },
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

    return NextResponse.json(completeDestination);
  } catch (error) {
    console.error("Error updating destination:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/destinations/:id
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    await prisma.destination.delete({
      where: { id: Number(id) },
    });
  
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("Error deleting destination:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

