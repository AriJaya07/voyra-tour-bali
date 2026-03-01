"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { locationService, LocationPayload } from "../service/location.service";

export function useLocations(destinationId?: number) {
  const queryClient = useQueryClient();
  const queryKey = ["locations", destinationId];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["locations"] });

  const { data = [], isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => locationService.getAll(destinationId),
  });

  const createMutation = useMutation({
    mutationFn: locationService.create,
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<LocationPayload> }) =>
      locationService.update(id, payload),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: locationService.delete,
    onSuccess: invalidate,
  });

  return {
    data,
    isLoading,
    isError,
    createLocation: createMutation.mutate,
    updateLocation: updateMutation.mutate,
    deleteLocation: deleteMutation.mutate,
    creating: createMutation.isPending,
    updating: updateMutation.isPending,
    deleting: deleteMutation.isPending,
  };
}