import axios from "axios"
import type { Category, DestinationWithImages, DestinationImage } from "@/types/tourism"
import { VIATOR_API_KEY, VIATOR_API_URL, VIATOR_HEADERS } from "@/lib/config/viator"

/** Bali destination ID in Viator (destId=98) */
const BALI_DESTINATION_ID = 98

// ── System/internal tags to exclude ──────────────────────────────────────
// These are Viator internal tags (quality scores, availability flags,
// logistics) that should never appear as user-facing categories.
const BLOCKED_TAG_IDS = new Set<number>([
  367661, // Short term availability
  367654, // Low Last Minute Supplier Cancellation Rate
  367652, // Top Product
  367653, // Low Supplier Cancellation Rate
  367659, // Curated Catalog
  367660, // Port Pickup
  21972,  // Excellent Quality
])

// Tags with IDs >= this threshold are almost always system/internal tags
const SYSTEM_TAG_THRESHOLD = 100000

// ── Category grouping ───────────────────────────────────────────────────
// Groups multiple Viator tag IDs into a single user-facing category.
// Each group defines: display name, slug (for icon matching), and tag IDs.
// Tags not in any group are shown individually using TAG_DISPLAY_NAMES.
interface CategoryGroup {
  name: string
  slug: string
  tagIds: number[]
}

const CATEGORY_GROUPS: CategoryGroup[] = [
  { name: "Private Tours",      slug: "private-tours",    tagIds: [11941, 11938, 21482] },
  { name: "Culture & Temples",  slug: "culture",          tagIds: [12032, 21521] },
  { name: "Nature",             slug: "nature",           tagIds: [11903, 11906] },
  { name: "Beach & Water",      slug: "beach",            tagIds: [21503, 12029, 11938] },
  { name: "Adventure",          slug: "adventure",        tagIds: [11938, 11903] },
  { name: "Food & Drink",       slug: "food-and-drink",   tagIds: [12071] },
  { name: "Day Trips",          slug: "day-trips",        tagIds: [21480] },
  { name: "Romantic",           slug: "romance",          tagIds: [21486] },
  { name: "Family",             slug: "family",           tagIds: [21491] },
  { name: "Wellness & Spa",     slug: "wellness-and-spa", tagIds: [21510] },
  { name: "Nightlife",          slug: "nightlife",        tagIds: [21514] },
  { name: "Tours",              slug: "tours",            tagIds: [11929, 11930, 21733, 11928, 11926] },
]


// ── Fallback display names for ungrouped tags ───────────────────────────
const TAG_DISPLAY_NAMES: Record<number, string> = {
  11929: "Tours",
  11930: "Bus Tours",
  21733: "Car Tours",
  11928: "Full-day Tours",
  11926: "Sightseeing",
  11941: "Private Sightseeing Tours",
  11938: "Private & Luxury",
  12032: "Culture",
  11903: "Nature",
  12071: "Food & Drink",
  12029: "Water Sports",
  21521: "Temple",
  21503: "Beach",
  21480: "Day Trips",
  11906: "Wildlife",
  21510: "Wellness & Spa",
  21711: "Walking Tours",
  21567: "Photography",
  21514: "Nightlife",
  21516: "Shopping",
  21479: "Transfers",
  21482: "Private Tours",
  21486: "Romantic",
  21491: "Family",
}

// ── Helpers ─────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function getBestImageUrl(images: any[], preferredWidth = 720): string {
  if (!images || images.length === 0) return "/images/destinations/gwk.png"
  const cover = images.find((img: any) => img.isCover) || images[0]
  const variants = cover?.variants
  if (!variants || variants.length === 0) return "/images/destinations/gwk.png"
  const sorted = [...variants].sort(
    (a: any, b: any) => Math.abs(a.width - preferredWidth) - Math.abs(b.width - preferredWidth)
  )
  return sorted[0].url
}

function resolveTagId(tag: any): number | null {
  if (typeof tag === "number") return tag
  if (tag && typeof tag === "object") return tag.tagId ?? tag.id ?? null
  return null
}

function viatorProductToDestination(product: any, categoryId: string): DestinationWithImages {
  const imageUrl = getBestImageUrl(product.images)
  const images: DestinationImage[] = [{ url: imageUrl, isMain: true }]

  if (product.images?.length > 1) {
    for (let i = 1; i < Math.min(product.images.length, 5); i++) {
      const url = getBestImageUrl([product.images[i]])
      if (url !== "/images/destinations/gwk.png") {
        images.push({ url, isMain: false })
      }
    }
  }

  return {
    id: product.productCode,
    title: product.title,
    slug: product.productCode,
    description: product.description || "",
    price: product.pricing?.summary?.fromPrice ?? null,
    categoryId,
    images,
  }
}

// ── Dynamic category discovery ──────────────────────────────────────────

interface DiscoveredTag {
  id: number
  image: string
  productCount: number
}

/**
 * Fetches Bali products and discovers tag IDs + images from them.
 * Returns a Map<tagId, { image, productCount }> sorted by popularity.
 */
async function fetchBaliProductTags(): Promise<Map<number, DiscoveredTag>> {
  if (!VIATOR_API_KEY) return new Map()

  try {
    const response = await axios.post(
      `${VIATOR_API_URL}/products/search`,
      {
        filtering: { destination: BALI_DESTINATION_ID },
        currency: "USD",
        pagination: { start: 1, count: 50 },
        sorting: { sort: "DEFAULT" },
      },
      { headers: VIATOR_HEADERS, timeout: 120000 }
    )

    const products: any[] = response.data?.products || []
    const tagMap = new Map<number, DiscoveredTag>()

    for (const product of products) {
      if (!Array.isArray(product.tags)) continue

      const productImage = getBestImageUrl(product.images || [], 480)

      for (const tag of product.tags) {
        const tagId = resolveTagId(tag)
        if (tagId == null) continue

        if (tagMap.has(tagId)) {
          tagMap.get(tagId)!.productCount++
        } else {
          tagMap.set(tagId, { id: tagId, image: productImage, productCount: 1 })
        }
      }
    }

    return tagMap
  } catch (error: any) {
    console.error("[Viator] Failed to fetch product tags:", error.response?.data || error.message)
    return new Map()
  }
}

/**
 * Tries to fetch tag names from the Viator API.
 * Attempts /products/tags and /taxonomy/tags endpoints.
 * Falls back to TAG_DISPLAY_NAMES if both fail.
 */
async function fetchViatorTagMap(): Promise<Map<number, string>> {
  if (!VIATOR_API_KEY) return new Map()

  const endpoints = [
    `${VIATOR_API_URL}/products/tags`,
    `${VIATOR_API_URL}/taxonomy/tags`,
  ]

  for (const url of endpoints) {
    try {
      const response = await axios.get(url, { headers: VIATOR_HEADERS, timeout: 120000 })

      const raw = response.data?.tags
        || response.data?.data
        || (Array.isArray(response.data) ? response.data : [])

      if (!Array.isArray(raw) || raw.length === 0) continue

      const map = new Map<number, string>()
      for (const tag of raw) {
        const id = tag.tagId ?? tag.id
        const name = tag.allNamesByLocale?.en ?? tag.name ?? tag.label ?? null
        if (id != null && name) map.set(Number(id), name)
      }

      if (map.size > 0) return map
    } catch {
      // Endpoint not available, try next
    }
  }

  // API doesn't expose tag names — use display name lookup
  const fallback = new Map<number, string>()
  for (const [id, name] of Object.entries(TAG_DISPLAY_NAMES)) {
    fallback.set(Number(id), name)
  }
  return fallback
}

// ── Public: Categories ──────────────────────────────────────────────────

/**
 * Builds Viator categories dynamically from real Bali products.
 *
 * Runs two fetches in parallel:
 *   1. fetchBaliProductTags()  → discovers tag IDs + images from products
 *   2. fetchViatorTagMap()     → gets tag names (API or fallback)
 *
 * Combines them → categories with real IDs, names, and images.
 * Returns the top 12 sorted by popularity.
 * Returns empty array if the API is unavailable.
 */
export async function getCategoriesFromViator(): Promise<Category[]> {
  const [baliTags, tagNames] = await Promise.all([
    fetchBaliProductTags(),
    fetchViatorTagMap(),
  ])

  if (baliTags.size === 0) return []

  // Collect all discovered tag IDs (filtered: no blocked, no system tags)
  const validTagIds = new Set<number>()
  for (const tagId of baliTags.keys()) {
    if (BLOCKED_TAG_IDS.has(tagId)) continue
    if (tagId >= SYSTEM_TAG_THRESHOLD) continue
    validTagIds.add(tagId)
  }

  // Build grouped categories — merge multiple tag IDs into one category
  const usedTagIds = new Set<number>()
  const categories: Category[] = []

  for (const group of CATEGORY_GROUPS) {
    // Find which of this group's tag IDs actually exist in products
    const matchingIds = group.tagIds.filter((id) => validTagIds.has(id))
    if (matchingIds.length === 0) continue

    // Pick the best image (from the tag with the most products)
    let bestImage = "/images/destinations/gwk.png"
    let bestCount = 0
    for (const id of matchingIds) {
      const tag = baliTags.get(id)
      if (tag && tag.productCount > bestCount) {
        bestCount = tag.productCount
        bestImage = tag.image
      }
    }

    // Sum product counts across all tags in the group
    const totalProducts = matchingIds.reduce(
      (sum, id) => sum + (baliTags.get(id)?.productCount ?? 0), 0
    )

    categories.push({
      id: `viator-${matchingIds[0]}`,
      name: group.name,
      slug: group.slug,
      image: bestImage,
      source: "viator",
      tagIds: matchingIds,
      _productCount: totalProducts,
    } as Category & { _productCount: number })

    matchingIds.forEach((id) => usedTagIds.add(id))
  }

  // Add any remaining valid tags not covered by groups
  for (const tagId of validTagIds) {
    if (usedTagIds.has(tagId)) continue

    const tag = baliTags.get(tagId)!
    const name = tagNames.get(tagId) || TAG_DISPLAY_NAMES[tagId] || `Tag ${tagId}`

    categories.push({
      id: `viator-${tagId}`,
      name,
      slug: slugify(name),
      image: tag.image,
      source: "viator",
      tagIds: [tagId],
      _productCount: tag.productCount,
    } as Category & { _productCount: number })
  }

  // Sort by product count, return top 12
  categories.sort((a, b) =>
    ((b as any)._productCount ?? 0) - ((a as any)._productCount ?? 0)
  )

  // Strip the temporary _productCount before returning
  return categories.slice(0, 12).map(({ _productCount, ...cat }: any) => cat)
}

// ── Public: Product detail (unchanged) ──────────────────────────────────

export async function getProductDetailFromViator(
  productCode: string,
  currency: string = "USD"
): Promise<{ title: string; description: string; imageUrl: string; price: number; currency: string } | null> {
  if (!VIATOR_API_KEY) return null

  try {
    const response = await axios.get(
      `${VIATOR_API_URL}/products/${productCode}`,
      {
        headers: { ...VIATOR_HEADERS, "Accept-Currency": currency },
        timeout: 10000,
      }
    )

    const data = response.data
    if (!data?.productCode) return null

    const imageUrl = getBestImageUrl(data.images || [], 1200)

    return {
      title: data.title || productCode,
      description: (data.description || "").substring(0, 200),
      imageUrl,
      price: data.pricing?.summary?.fromPrice ?? 0,
      currency: data.pricing?.currency ?? currency,
    }
  } catch {
    return null
  }
}

// ── Public: Destinations (unchanged) ────────────────────────────────────

export async function getDestinationsFromViator(
  currency: string = "IDR"
): Promise<DestinationWithImages[]> {
  if (!VIATOR_API_KEY) return []

  try {
    const response = await axios.post(
      `${VIATOR_API_URL}/products/search`,
      {
        filtering: { destination: BALI_DESTINATION_ID },
        currency,
        pagination: { start: 1, count: 30 },
        sorting: { sort: "DEFAULT" },
      },
      { headers: VIATOR_HEADERS, timeout: 120000 }
    )

    const products = response.data?.products || []
    return products.map((p: any) => viatorProductToDestination(p, "v-0"))
  } catch (error: any) {
    console.error("[Viator] Failed to fetch destinations:", error.response?.data || error.message)
    return []
  }
}
