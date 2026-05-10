import { unstable_cache } from "next/cache"
import type { Category, DestinationWithImages } from "@/types/tourism"
import { getCategoriesFromViator, getDestinationsFromViator, getProductDetailFromViator } from "./viator"
import { getCategoriesFromDB, getDestinationsFromDB } from "./db"

// Re-export for convenience
export { getProductDetailFromViator as getProductDetail }

/**
 * Data source strategy:
 *   "viator" → Viator API only
 *   "db"     → Database only
 *   "hybrid" → Both sources, each category tagged with its own source
 */
type DataSource = "viator" | "db" | "hybrid"

const DATA_SOURCE: DataSource = "hybrid"

// 10-minute cache for Viator/DB hybrid results. Bust via revalidateTag.
const CACHE_REVALIDATE_SEC = 600

// ── Categories ──────────────────────────────────────────────────────────

async function fetchCategories(): Promise<Category[]> {
  switch (DATA_SOURCE) {
    case "db":
      return getCategoriesFromDB()

    case "hybrid": {
      const [dbRes, viatorRes] = await Promise.allSettled([
        getCategoriesFromDB(),
        getCategoriesFromViator(),
      ])
      const dbCategories = dbRes.status === "fulfilled" ? dbRes.value : []
      const viatorCategories = viatorRes.status === "fulfilled" ? viatorRes.value : []
      if (dbRes.status === "rejected") {
        console.error("[getCategories] db source failed:", dbRes.reason)
      }
      if (viatorRes.status === "rejected") {
        console.error("[getCategories] viator source failed:", viatorRes.reason)
      }
      return [...viatorCategories, ...dbCategories]
    }

    case "viator":
    default:
      return getCategoriesFromViator()
  }
}

export const getCategories = unstable_cache(fetchCategories, ["categories-v1"], {
  revalidate: CACHE_REVALIDATE_SEC,
  tags: ["categories"],
})

// ── Destinations ────────────────────────────────────────────────────────

async function fetchDestinations(): Promise<DestinationWithImages[]> {
  switch (DATA_SOURCE) {
    case "db":
      return getDestinationsFromDB()

    case "hybrid": {
      const [dbRes, viatorRes] = await Promise.allSettled([
        getDestinationsFromDB(),
        getDestinationsFromViator(),
      ])
      const dbDestinations = dbRes.status === "fulfilled" ? dbRes.value : []
      const viatorDestinations = viatorRes.status === "fulfilled" ? viatorRes.value : []
      if (dbRes.status === "rejected") {
        console.error("[getDestinations] db source failed:", dbRes.reason)
      }
      if (viatorRes.status === "rejected") {
        console.error("[getDestinations] viator source failed:", viatorRes.reason)
      }
      return [...dbDestinations, ...viatorDestinations]
    }

    case "viator":
    default:
      return getDestinationsFromViator()
  }
}

export const getDestinations = unstable_cache(fetchDestinations, ["destinations-v1"], {
  revalidate: CACHE_REVALIDATE_SEC,
  tags: ["destinations"],
})
