import { getViatorImageUrl, formatDuration } from "@/utils/hooks/useViator"
import type { UnifiedActivity } from "@/types/tourism"

export function mapViatorToActivity(product: any): UnifiedActivity {
  const fromPrice = product.pricing?.summary?.fromPrice ?? 0
  const beforeDiscount = product.pricing?.summary?.fromPriceBeforeDiscount

  return {
    id: product.productCode,
    source: "viator",
    title: product.title,
    description: product.description || "",
    imageUrl: getViatorImageUrl(product.images, 480),
    price: fromPrice,
    priceBeforeDiscount: beforeDiscount && beforeDiscount > fromPrice ? beforeDiscount : undefined,
    currency: product.pricing?.currency ?? "USD",
    rating: product.reviews?.combinedAverageRating,
    reviewCount: product.reviews?.totalReviews,
    duration: formatDuration(product.duration),
    freeCancellation: product.flags?.includes("FREE_CANCELLATION"),
    productCode: product.productCode,
  }
}

export function mapDBToActivity(dest: any): UnifiedActivity {
  const mainImage = dest.images?.find((img: any) => img.isMain)?.url
    || dest.images?.[0]?.url
    || "/images/destinations/gwk.png"

  return {
    id: `db-${dest.id}`,
    source: "db",
    title: dest.title,
    description: dest.description || "",
    imageUrl: mainImage,
    price: dest.price ?? 0,
    currency: "IDR",
    slug: dest.slug || String(dest.id),
    categoryId: dest.categoryId,
  }
}
