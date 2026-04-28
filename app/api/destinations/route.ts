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
    console.error("Error fetching destinations:", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json(
      { error: "Failed to fetch destinations" },
      { status: 500 }
    );
  }
}

interface ImageInput {
  id: number | string;
  altText?: string | null;
  isMain?: boolean;
  order?: number;
}

interface ContentInput {
  title: string;
  subTitle?: string | null;
  description: string;
  dateAvailable: string;
  isAvailable: boolean;
  images?: ImageInput[];
}

interface LocationInput {
  title: string;
  description?: string | null;
  hrefLink?: string | null;
  images?: ImageInput[];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      title,
      description,
      price,
      categoryId,
      slug,
      images,
      contents,
      locations,
    }: {
      title: string;
      description: string;
      price: number | string;
      categoryId: number | string;
      slug?: string;
      images?: ImageInput[];
      contents?: ContentInput[];
      locations?: LocationInput[];
    } = body;

    if (!title || !description || price === undefined || price === null || !categoryId) {
      return NextResponse.json(
        { error: "Title, description, price, and category are required" },
        { status: 400 }
      );
    }

    const destinationId = await prisma.$transaction(async (tx) => {
      const destination = await tx.destination.create({
        data: {
          title,
          description,
          price: Number(price),
          categoryId: Number(categoryId),
          slug: slug || undefined,
        },
      });

      if (images && images.length > 0) {
        await Promise.all(
          images.map((image, index) =>
            tx.image.update({
              where: { id: Number(image.id) },
              data: {
                destinationId: destination.id,
                altText: image.altText || null,
                isMain: image.isMain || false,
                order: image.order ?? index,
              },
            })
          )
        );
      }

      if (contents && contents.length > 0) {
        for (const content of contents) {
          const createdContent = await tx.content.create({
            data: {
              title: content.title,
              subTitle: content.subTitle || null,
              description: content.description,
              dateAvailable: new Date(content.dateAvailable),
              isAvailable: content.isAvailable,
              destinationId: destination.id,
            },
          });

          if (content.images && content.images.length > 0) {
            await Promise.all(
              content.images.map((image, index) =>
                tx.image.update({
                  where: { id: Number(image.id) },
                  data: {
                    contentId: createdContent.id,
                    altText: image.altText || null,
                    isMain: image.isMain || false,
                    order: image.order ?? index,
                  },
                })
              )
            );
          }
        }
      }

      if (locations && locations.length > 0) {
        for (const location of locations) {
          const createdLocation = await tx.location.create({
            data: {
              title: location.title,
              description: location.description || null,
              hrefLink: location.hrefLink || null,
              destinationId: destination.id,
            },
          });

          if (location.images && location.images.length > 0) {
            await Promise.all(
              location.images.map((image, index) =>
                tx.image.update({
                  where: { id: Number(image.id) },
                  data: {
                    locationId: createdLocation.id,
                    altText: image.altText || null,
                    isMain: image.isMain || false,
                    order: image.order ?? index,
                  },
                })
              )
            );
          }
        }
      }

      return destination.id;
    });

    const completeDestination = await prisma.destination.findUnique({
      where: { id: destinationId },
      include: {
        category: true,
        images: true,
        packages: true,
        contents: { include: { images: true } },
        locations: { include: { images: true } },
      },
    });

    return NextResponse.json(completeDestination, { status: 201 });
  } catch (error) {
    console.error("Error creating destination:", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json(
      { error: "Failed to create destination" },
      { status: 500 }
    );
  }
}
