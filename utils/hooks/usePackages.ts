"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { packageService, PackagePayload } from "../service/package.service";

export function usePackages() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["packages"] });

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["packages"],
    queryFn: packageService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: packageService.create,
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<PackagePayload> }) =>
      packageService.update(id, payload),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: packageService.delete,
    onSuccess: invalidate,
  });

  return {
    data,
    isLoading,
    isError,
    createPackage: createMutation.mutate,
    updatePackage: updateMutation.mutate,
    deletePackage: deleteMutation.mutate,
    creating: createMutation.isPending,
    updating: updateMutation.isPending,
    deleting: deleteMutation.isPending,
  };
}