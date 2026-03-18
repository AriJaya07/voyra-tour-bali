import type { DestinationWithImages, UnifiedActivity } from "@/types/tourism"
import type { ViatorProduct } from "@/utils/hooks/useViator"
import { getViatorImageUrl, formatDuration } from "@/utils/hooks/useViator"

/**
 * Convert a DB destination into a UnifiedActivity.
 */
export function mapDestinationToActivity(dest: DestinationWithImages): UnifiedActivity {
  const mainImage = dest.images.find(img => img.isMain)?.url
    || dest.images[0]?.url
    || "/images/destinations/gwk.png"

  return {
    id: `db-${dest.id}`,
    source: "db",
    title: dest.title,
    description: dest.description,
    imageUrl: mainImage,
    price: dest.price ?? 0,
    currency: "IDR",
    slug: dest.slug ?? undefined,
    categoryId: dest.categoryId,
  }
}

/**
 * Convert a Viator product into a UnifiedActivity.
 */
export function mapViatorToActivity(product: ViatorProduct): UnifiedActivity {
  return {
    id: product.productCode,
    source: "viator",
    title: product.title,
    description: product.description,
    imageUrl: getViatorImageUrl(product.images, 480),
    price: product.pricing?.summary?.fromPrice ?? 0,
    currency: product.pricing?.currency ?? "USD",
    rating: product.reviews?.combinedAverageRating,
    reviewCount: product.reviews?.totalReviews,
    duration: formatDuration(product.duration),
    freeCancellation: product.flags?.includes("FREE_CANCELLATION"),
    productCode: product.productCode,
  }
}

/**
 * Merge DB destinations and Viator products into a single list.
 * DB destinations appear first, then Viator products.
 */
export function mergeActivities(
  destinations: DestinationWithImages[],
  viatorProducts: ViatorProduct[],
  categoryId?: number | null
): UnifiedActivity[] {
  // Filter DB destinations by category if provided
  const filteredDest = categoryId != null
    ? destinations.filter(d => d.categoryId === categoryId)
    : destinations

  const dbItems = filteredDest.map(mapDestinationToActivity)
  const viatorItems = viatorProducts.map(mapViatorToActivity)

  return [...dbItems, ...viatorItems]
}
