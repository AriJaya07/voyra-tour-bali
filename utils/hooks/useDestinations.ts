"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { destinationService } from "../service/destination.service";

/**
 * Fetches DB destinations filtered by categoryId.
 * Used by homepage components for categories with source: "db".
 */
export function useDBDestinations(categoryId: number | string | null) {
  return useQuery({
    queryKey: ["db-destinations", categoryId],
    queryFn: () => destinationService.getByCategory(categoryId!),
    enabled: !!categoryId,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}

export function useDestinations() {
  const queryClient = useQueryClient();

  // 🔹 GET
  const {
    data = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["destinations"],
    queryFn: destinationService.getAll,
  });

  // 🔹 CREATE
  const createMutation = useMutation({
    mutationFn: destinationService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["destinations"] });
    },
  });

  // 🔹 UPDATE
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number | string;
      payload: any;
    }) => destinationService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["destinations"] });
    },
  });

  // 🔹 DELETE
  const deleteMutation = useMutation({
    mutationFn: destinationService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["destinations"] });
    },
  });

  return {
    data,
    isLoading,
    isError,
    createDestination: createMutation.mutate,
    updateDestination: updateMutation.mutate,
    deleteDestination: deleteMutation.mutate,
    creating: createMutation.isPending,
    updating: updateMutation.isPending,
    deleting: deleteMutation.isPending,
  };
}