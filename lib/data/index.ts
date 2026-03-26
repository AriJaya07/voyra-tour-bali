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

// ── Categories ──────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  switch (DATA_SOURCE) {
    case "db":
      return getCategoriesFromDB()

    case "hybrid": {
      // Fetch both sources in parallel — each tagged with source: "db" | "viator"
      const [dbCategories, viatorCategories] = await Promise.all([
        getCategoriesFromDB(),
        getCategoriesFromViator(),
      ])

      // Viator first (primary content), then DB categories
      return [...viatorCategories, ...dbCategories]
    }

    case "viator":
    default:
      return getCategoriesFromViator()
  }
}

// ── Destinations ────────────────────────────────────────────────────────

export async function getDestinations(): Promise<DestinationWithImages[]> {
  switch (DATA_SOURCE) {
    case "db":
      return getDestinationsFromDB()

    case "hybrid": {
      const [dbDestinations, viatorDestinations] = await Promise.all([
        getDestinationsFromDB(),
        getDestinationsFromViator(),
      ])
      return [...dbDestinations, ...viatorDestinations]
    }

    case "viator":
    default:
      return getDestinationsFromViator()
  }
}
