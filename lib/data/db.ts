import { prisma } from "@/lib/prisma"
import type { Category, DestinationWithImages } from "@/types/tourism"

/**
 * Fetches categories from the database and normalizes to the shared Category type.
 */
export async function getCategoriesFromDB(): Promise<Category[]> {
  const rows = await prisma.category.findMany()
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    image: r.image,
  }))
}

/**
 * Fetches destinations (with images) from the database and normalizes.
 */
export async function getDestinationsFromDB(): Promise<DestinationWithImages[]> {
  const rows = await prisma.destination.findMany({ include: { images: true } })
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug ?? "",
    description: r.description,
    price: r.price,
    categoryId: r.categoryId,
    images: r.images.map((img) => ({
      url: img.url,
      isMain: img.isMain,
      altText: img.altText,
    })),
  }))
}
