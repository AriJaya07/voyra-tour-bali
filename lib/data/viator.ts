import axios from "axios"
import type { Category, DestinationWithImages, DestinationImage } from "@/types/tourism"

// ── Viator config ───────────────────────────────────────────────────────
const VIATOR_API_KEY = process.env.VIATOR_API_KEY || ""

const VIATOR_BASE_URL = VIATOR_API_KEY?.startsWith("sandbox")
  ? "https://api.sandbox.viator.com/partner"
  : "https://api.viator.com/partner"

const VIATOR_HEADERS = {
  Accept: "application/json;version=2.0",
  "Accept-Language": "en-US",
  "Content-Type": "application/json",
  "exp-api-key": VIATOR_API_KEY,
}

/** Bali destination ID in Viator (destId=98) */
const BALI_DESTINATION_ID = 98

// ── Display name lookup ─────────────────────────────────────────────────
// The Viator v2 API returns tags as plain numbers — no names.
// This lookup provides human-readable names for known tag IDs.
// It is NOT the category source — categories are discovered dynamically
// from real products. This only controls what name is displayed.
// Unknown tags will show as "Tag {id}".
const TAG_DISPLAY_NAMES: Record<number, string> = {
  11929: "Tours",
  12032: "Culture",
  11903: "Nature",
  12071: "Food & Drink",
  11938: "Adventure",
  12029: "Water Sports",
  21521: "Temple",
  21503: "Beach",
  11926: "Sightseeing",
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
      `${VIATOR_BASE_URL}/products/search`,
      {
        filtering: { destination: BALI_DESTINATION_ID },
        currency: "USD",
        pagination: { start: 1, count: 50 },
        sorting: { sort: "DEFAULT" },
      },
      { headers: VIATOR_HEADERS, timeout: 15000 }
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
    `${VIATOR_BASE_URL}/products/tags`,
    `${VIATOR_BASE_URL}/taxonomy/tags`,
  ]

  for (const url of endpoints) {
    try {
      const response = await axios.get(url, { headers: VIATOR_HEADERS, timeout: 15000 })

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

  // Sort by product count (most popular first)
  const sorted = Array.from(baliTags.values()).sort((a, b) => b.productCount - a.productCount)

  return sorted.slice(0, 12).map((tag) => {
    const name = tagNames.get(tag.id) || `Tag ${tag.id}`
    return {
      id: `viator-${tag.id}`,
      name,
      slug: slugify(name),
      image: tag.image,
      source: "viator" as const,
      tagIds: [tag.id],
    }
  })
}

// ── Public: Product detail (unchanged) ──────────────────────────────────

export async function getProductDetailFromViator(
  productCode: string,
  currency: string = "USD"
): Promise<{ title: string; description: string; imageUrl: string; price: number; currency: string } | null> {
  if (!VIATOR_API_KEY) return null

  try {
    const response = await axios.get(
      `${VIATOR_BASE_URL}/products/${productCode}`,
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
      `${VIATOR_BASE_URL}/products/search`,
      {
        filtering: { destination: BALI_DESTINATION_ID },
        currency,
        pagination: { start: 1, count: 30 },
        sorting: { sort: "DEFAULT" },
      },
      { headers: VIATOR_HEADERS, timeout: 15000 }
    )

    const products = response.data?.products || []
    return products.map((p: any) => viatorProductToDestination(p, "v-0"))
  } catch (error: any) {
    console.error("[Viator] Failed to fetch destinations:", error.response?.data || error.message)
    return []
  }
}
