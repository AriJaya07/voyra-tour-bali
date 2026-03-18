/**
 * Normalized types — source-agnostic.
 * Components consume these types, never Prisma or Viator types directly.
 */

// ── Category ────────────────────────────────────────────────────────────
export interface Category {
  id: number | string
  name: string
  slug: string
  description?: string | null
  image?: string | null
  /** Viator tag IDs used when fetching products for this category */
  tagIds?: number[]
}

// ── Destination / Product image ─────────────────────────────────────────
export interface DestinationImage {
  url: string
  isMain: boolean
  altText?: string | null
}

// ── Destination (gallery items shown in Destination component) ──────────
export interface DestinationWithImages {
  id: number | string
  title: string
  slug: string
  description: string
  price?: number | null
  categoryId?: number | string | null
  images: DestinationImage[]
}

// ── Unified Activity (used by TrendingActivity) ─────────────────────────
export interface UnifiedActivity {
  id: string                    // DB: `db-{id}`, Viator: productCode
  source: "db" | "viator"
  title: string
  description: string
  imageUrl: string
  price: number
  priceBeforeDiscount?: number  // original price before discount (Viator fromPriceBeforeDiscount)
  currency: string              // "IDR" | "USD"
  rating?: number
  reviewCount?: number
  duration?: string             // e.g. "2h 30m"
  freeCancellation?: boolean
  slug?: string                 // DB destination slug (for /detail/[slug])
  productCode?: string          // Viator product code (for /viator/[code])
  categoryId?: number | string | null
}
