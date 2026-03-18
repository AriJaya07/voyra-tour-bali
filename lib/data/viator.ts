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

// ── Category ↔ Viator tag mapping ──────────────────────────────────────
const VIATOR_CATEGORIES: Category[] = [
  { id: "v-1",  name: "Tours",        slug: "tours",        image: null, tagIds: [11929] },
  { id: "v-2",  name: "Romance",      slug: "romance",      image: null, tagIds: [11929] },
  { id: "v-3",  name: "Family",       slug: "family",       image: null, tagIds: [11929] },
  { id: "v-4",  name: "Culture",      slug: "culture",      image: null, tagIds: [11929, 12032] },
  { id: "v-5",  name: "Nature",       slug: "nature",       image: null, tagIds: [11903, 12029] },
  { id: "v-6",  name: "Food & Drink", slug: "food-drink",   image: null, tagIds: [12071] },
  { id: "v-7",  name: "Adventure",    slug: "adventure",    image: null, tagIds: [11903, 11938] },
  { id: "v-8",  name: "Water Sports", slug: "water-sports", image: null, tagIds: [11938, 12029] },
  { id: "v-9",  name: "Temple",       slug: "temple",       image: null, tagIds: [11929, 12032] },
  { id: "v-10", name: "Beach",        slug: "beach",        image: null, tagIds: [11903, 12029] },
]

// ── Helpers ─────────────────────────────────────────────────────────────

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

/** Fetch a broad set of Bali products and collect all tag IDs present */
async function fetchBaliProductTags(): Promise<Set<number>> {
  if (!VIATOR_API_KEY) return new Set()

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
    const tagSet = new Set<number>()
    for (const product of products) {
      if (Array.isArray(product.tags)) {
        for (const tag of product.tags) {
          tagSet.add(typeof tag === "number" ? tag : tag.tagId ?? tag.id)
        }
      }
    }
    return tagSet
  } catch (error: any) {
    console.error("[Viator] Failed to fetch product tags:", error.response?.data || error.message)
    return new Set()
  }
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Returns only categories whose tag IDs exist in actual Bali products.
 * Fetches a sample of Bali products, collects their tags, and filters.
 * Falls back to all categories if the API call fails.
 */
export async function getCategoriesFromViator(): Promise<Category[]> {
  const availableTags = await fetchBaliProductTags()

  // If we couldn't fetch tags (API down / no key), return all categories
  if (availableTags.size === 0) return VIATOR_CATEGORIES

  // Keep only categories that have at least one matching tag in Bali products
  const validated = VIATOR_CATEGORIES.filter((cat) => {
    if (!cat.tagIds || cat.tagIds.length === 0) return false
    return cat.tagIds.some((tagId) => availableTags.has(tagId))
  })

  return validated.length > 0 ? validated : VIATOR_CATEGORIES
}

/**
 * Fetches a single product detail from Viator (server-side, for SEO metadata).
 * Returns null if not found or API unavailable.
 */
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

/**
 * Fetches Bali products from Viator and normalizes them as destinations.
 */
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
    const defaultCategoryId = VIATOR_CATEGORIES[0]?.id ?? "v-1"

    return products.map((p: any) => viatorProductToDestination(p, String(defaultCategoryId)))
  } catch (error: any) {
    console.error("[Viator] Failed to fetch destinations:", error.response?.data || error.message)
    return []
  }
}
