import { Category, Destination as PrismaDestination, Image as PrismaImage } from "@prisma/client"

// Re-export Prisma types for convenience
export type { Category }
export type DestinationWithImages = PrismaDestination & { images: PrismaImage[] }

/**
 * Unified activity item — a common shape for both DB destinations and Viator products.
 * This allows mixing data from multiple sources in a single UI component.
 */
export interface UnifiedActivity {
  id: string                    // DB: `db-{id}`, Viator: productCode
  source: "db" | "viator"
  title: string
  description: string
  imageUrl: string
  price: number
  currency: string              // "IDR" | "USD"
  rating?: number
  reviewCount?: number
  duration?: string             // e.g. "2h 30m"
  freeCancellation?: boolean
  slug?: string                 // DB destination slug (for /detail/[slug])
  productCode?: string          // Viator product code (for /viator/[code])
  categoryId?: number | null
}
