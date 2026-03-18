import type { Category, DestinationWithImages } from "@/types/tourism"
import { getCategoriesFromViator, getDestinationsFromViator } from "./viator"
import { getCategoriesFromDB, getDestinationsFromDB } from "./db"

/**
 * Data source strategy:
 *   "viator" → Viator API only (current default)
 *   "db"     → Database only
 *   "hybrid" → DB first, fallback/merge with Viator
 */
type DataSource = "viator" | "db" | "hybrid"

const DATA_SOURCE: DataSource = "viator"

// ── Categories ──────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  switch (DATA_SOURCE) {
    case "db":
      return getCategoriesFromDB()

    case "hybrid": {
      const dbCategories = await getCategoriesFromDB()
      if (dbCategories.length > 0) return dbCategories
      return getCategoriesFromViator()
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
      const dbDestinations = await getDestinationsFromDB()
      if (dbDestinations.length > 0) return dbDestinations
      return getDestinationsFromViator()
    }

    case "viator":
    default:
      return getDestinationsFromViator()
  }
}
