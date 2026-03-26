"use client"

import { useMemo } from "react"
import { useViatorProducts } from "./useViator"
import { mergeActivities } from "@/lib/unifiedActivities"
import type { DestinationWithImages, UnifiedActivity } from "@/types/tourism"

/**
 * Hook that merges DB destinations with Viator products for a given category.
 *
 * - DB destinations are passed in as props (server-rendered)
 * - Viator products are fetched client-side via React Query
 * - Returns a unified list of activities
 */
export function useUnifiedActivities(
  destinations: DestinationWithImages[],
  tagIds: number[] | null,
  categoryId: number | null,
  currency: string = "USD"
) {
  const {
    data: viatorProducts,
    isLoading: viatorLoading,
    isError: viatorError,
  } = useViatorProducts(tagIds, currency)

  const activities: UnifiedActivity[] = useMemo(() => {
    return mergeActivities(
      destinations,
      viatorProducts ?? [],
      categoryId
    )
  }, [destinations, viatorProducts, categoryId])

  // We have DB data immediately, only Viator is loading
  const hasDbData = activities.some(a => a.source === "db")
  const isLoading = viatorLoading && !hasDbData
  const hasViatorWarning = viatorError || (viatorProducts?.length === 0 && !viatorLoading)

  return {
    activities,
    isLoading,
    viatorLoading,
    viatorError,
    hasViatorWarning,
  }
}
