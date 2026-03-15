"use client";

import { useQuery } from "@tanstack/react-query";
import { destinationService } from "../service/destination.service";
import type { Destination } from "../service/destination.service";

export function useSearchDestinations(enabled: boolean) {
  return useQuery<Destination[]>({
    queryKey: ["destinations-search"],
    queryFn: destinationService.getAll,
    enabled,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}
